import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { env } from './src/config/env.js';
import authRoutes from './src/routes/auth.routes.js';
import debateRoutes from './src/routes/debate.routes.js';
import argumentRoutes from './src/routes/argument.routes.js';
import judgmentRoutes from './src/routes/judgment.routes.js';
import voteRoutes from './src/routes/vote.routes.js';
import profileRoutes from './src/routes/profile.routes.js';
import contentRoutes from './src/routes/content.routes.js';
import feedbackRoutes from './src/routes/feedback.routes.js';
import ogRoutes from './src/routes/og.routes.js';
import aiRoutes from './src/routes/ai.routes.js';
import commentRoutes from './src/routes/comment.routes.js';
import cronRoutes from './src/routes/cron.routes.js';
import notificationRoutes from './src/routes/notification.routes.js';
import chatRoutes from './src/routes/chat.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import { errorHandler } from './src/middleware/errorHandler.js';

const app = express();
const httpServer = createServer(app);

// ===== Socket.io =====
const corsOrigins = [env.CLIENT_URL, 'http://localhost:5173'].filter(Boolean);
export const io = new Server(httpServer, {
  cors: { origin: corsOrigins, credentials: true },
});

// 방별 참여자 상태 관리
const roomParticipants = {};
const timeVotes = {};

io.on('connection', (socket) => {
  socket.on('join-room', (debateId) => socket.join(debateId));
  socket.on('leave-room', (debateId) => socket.leave(debateId));

  // ===== Presence: 참여자 입장 =====
  socket.on('join-presence', ({ debateId, userId, nickname, avatarUrl, side }) => {
    if (!roomParticipants[debateId]) roomParticipants[debateId] = {};
    // 기존 참여자면 socketId만 갱신 (ready, side 유지)
    if (roomParticipants[debateId][userId]) {
      roomParticipants[debateId][userId].socketId = socket.id;
      roomParticipants[debateId][userId].nickname = nickname;
      if (avatarUrl) roomParticipants[debateId][userId].avatarUrl = avatarUrl;
    } else {
      roomParticipants[debateId][userId] = { userId, nickname, avatarUrl: avatarUrl || null, side: side || null, ready: false, socketId: socket.id };
    }
    const slots = buildSlots(debateId);
    io.to(debateId).emit('presence-sync', slots);
    // 재접속 시 이탈 해제 알림
    socket.to(debateId).emit('opponent-returned', { userId });
  });

  // ===== Presence: 사이드 선택 =====
  socket.on('select-side', ({ debateId, userId, nickname, avatarUrl, side, ready }) => {
    if (roomParticipants[debateId]?.[userId]) {
      roomParticipants[debateId][userId].side = side;
      roomParticipants[debateId][userId].nickname = nickname;
      if (avatarUrl) roomParticipants[debateId][userId].avatarUrl = avatarUrl;
      roomParticipants[debateId][userId].ready = ready || false;
    }
    io.to(debateId).emit('presence-sync', buildSlots(debateId));

    // B측 선택 시 DB opponent_id 즉시 업데이트 (로비 피드 실시간 반영)
    if (side === 'B') {
      import('./src/config/supabase.js').then(async ({ supabaseAdmin }) => {
        const { data: debate } = await supabaseAdmin.from('debates').select('creator_id, opponent_id').eq('id', debateId).single();
        if (debate && !debate.opponent_id && userId !== debate.creator_id) {
          await supabaseAdmin.from('debates').update({ opponent_id: userId }).eq('id', debateId).is('opponent_id', null);
        }
      }).catch(() => {});
    }
  });

  // ===== Presence: 퇴장 =====
  socket.on('leave-presence', ({ debateId, userId }) => {
    if (roomParticipants[debateId]) {
      delete roomParticipants[debateId][userId];
      io.to(debateId).emit('presence-sync', buildSlots(debateId));
    }
  });

  // ===== 타이핑 인디케이터 =====
  socket.on('typing', ({ debateId, userId, typing, side }) => {
    socket.to(debateId).emit('opponent-typing', { typing, side });
  });

  // ===== 게임 시작 (서버가 시간 관리) =====
  socket.on('start-game', async ({ debateId }) => {
    const CHAT_DURATION_MS = 15 * 60 * 1000; // 15분
    const now = new Date();
    const chat_deadline = new Date(now.getTime() + CHAT_DURATION_MS).toISOString();
    const chat_started_at = now.toISOString();

    // 양쪽에 서버 기준 deadline 전달
    io.to(debateId).emit('game-start', { chat_deadline, chat_started_at });

    // DB 저장 + 알림
    import('./src/config/supabase.js').then(async ({ supabaseAdmin }) => {
      await supabaseAdmin.from('debates').update({ chat_deadline, chat_started_at, status: 'chatting' }).eq('id', debateId);
      // 채팅 시작 알림
      try {
        const { data: debate } = await supabaseAdmin.from('debates').select('creator_id, opponent_id, topic').eq('id', debateId).single();
        if (debate) {
          const { createNotification } = await import('./src/services/notification.service.js');
          const targets = [debate.creator_id, debate.opponent_id].filter(Boolean);
          for (const uid of targets) {
            await createNotification({ userId: uid, type: 'chat_start', title: '실시간 논쟁이 시작되었습니다!', message: `"${debate.topic?.slice(0, 30)}"`, link: `/debate/${debateId}/chat` });
          }
        }
      } catch { }
    }).catch(() => { });

    // 서버 타이머: 시간 만료 시 자동 판결 트리거
    setTimeout(async () => {
      try {
        const { supabaseAdmin } = await import('./src/config/supabase.js');
        const { data: debate } = await supabaseAdmin.from('debates').select('status').eq('id', debateId).single();
        if (debate?.status === 'chatting') {
          await supabaseAdmin.from('debates').update({ status: 'judging' }).eq('id', debateId).eq('status', 'chatting');
          io.to(debateId).emit('chat-ended', { debateId });
          const { triggerJudgment } = await import('./src/services/judgmentTrigger.service.js');
          triggerJudgment(debateId).catch(err => console.error('[Timer] 판결 실패:', err.message));
          console.log(`[Timer] ${debateId} 채팅 종료 → 판결 트리거`);
        }
      } catch (err) { console.error('[Timer] 에러:', err.message); }
    }, CHAT_DURATION_MS);
  });

  // ===== 실시간 메시지: 비속어 필터 → 즉시 브로드캐스트 → DB 비동기 저장 =====
  socket.on('send-message', async (payload) => {
    const { debateId, userId, nickname, content, side } = payload;
    if (!debateId || !userId || !content?.trim() || !side) return;

    // 1. 비속어 필터
    try {
      const { filterByDictionary } = await import('./src/services/contentFilter.service.js');
      const filterResult = filterByDictionary(content.trim());
      if (filterResult.blocked) {
        socket.emit('filter-blocked', { reason: filterResult.reason });
        return;
      }
    } catch { }

    // 2. 참여자 확인 + opponent 자동 등록 + 상태 전환
    let validSide = side;
    try {
      const { supabaseAdmin } = await import('./src/config/supabase.js');
      const { data: debate } = await supabaseAdmin.from('debates').select('creator_id, opponent_id, mode, status').eq('id', debateId).single();
      if (!debate) return;
      // 참여자 검증 + 사이드 강제
      if (userId === debate.creator_id) {
        validSide = 'A'; // 생성자는 항상 A측
      } else if (userId === debate.opponent_id) {
        validSide = 'B'; // 상대방은 항상 B측
      } else if (!debate.opponent_id && debate.mode === 'chat' && userId !== debate.creator_id) {
        // B측 미등록 → 자동 등록 (본인이 아닌 경우에만)
        await supabaseAdmin.from('debates').update({ opponent_id: userId }).eq('id', debateId).is('opponent_id', null);
        validSide = 'B';
      } else if (roomParticipants[debateId]?.[userId]?.side) {
        validSide = roomParticipants[debateId][userId].side;
      } else {
        socket.emit('filter-blocked', { reason: '이 논쟁의 참여자만 채팅할 수 있습니다.' });
        return;
      }
      // waiting → chatting 자동 전환 (start-game 미실행 폴백)
      if (debate.status !== 'chatting' && debate.mode === 'chat') {
        const now = new Date();
        const CHAT_DURATION_MS = 15 * 60 * 1000;
        const chat_started_at = now.toISOString();
        const chat_deadline = debate.chat_deadline || new Date(now.getTime() + CHAT_DURATION_MS).toISOString();
        await supabaseAdmin.from('debates').update({ status: 'chatting', chat_started_at, chat_deadline }).eq('id', debateId);
        // 서버 타이머도 시작
        const remaining = new Date(chat_deadline).getTime() - now.getTime();
        if (remaining > 0) {
          setTimeout(async () => {
            try {
              const { data: d } = await supabaseAdmin.from('debates').select('status').eq('id', debateId).single();
              if (d?.status === 'chatting') {
                await supabaseAdmin.from('debates').update({ status: 'judging' }).eq('id', debateId).eq('status', 'chatting');
                io.to(debateId).emit('chat-ended', { debateId });
                const { triggerJudgment } = await import('./src/services/judgmentTrigger.service.js');
                triggerJudgment(debateId).catch(err => console.error('[Socket Timer] 판결 실패:', err.message));
              }
            } catch (err) { console.error('[Socket Timer] 에러:', err.message); }
          }, remaining);
        }
      }
    } catch { }

    const msgId = crypto.randomUUID();
    const now = new Date().toISOString();
    const msg = { id: msgId, debate_id: debateId, user_id: userId, nickname, content: content.trim(), side: validSide, created_at: now };

    io.to(debateId).emit('new-message', msg);

    import('./src/config/supabase.js').then(({ supabaseAdmin }) => {
      supabaseAdmin.from('chat_messages').insert(msg).then(({ error }) => {
        if (error) console.error('[Socket] DB 저장 실패:', error.message);
      });
    }).catch(() => { });
  });

  socket.on('request-time-change', ({ debateId, userId, type, currentDeadline }) => {
    const slots = buildSlots(debateId);
    const total = [...slots.A, ...slots.B].length;
    const requester = roomParticipants[debateId]?.[userId];
    if (!requester?.side) return;
    timeVotes[debateId] = { type, votes: { [userId]: true }, requiredCount: total, currentDeadline };
    io.to(debateId).emit('time-change-request', { type, requesterId: userId, votes: { [userId]: true }, requiredCount: total });
  });

  socket.on('vote-time-change', ({ debateId, userId, agree }) => {
    const vote = timeVotes[debateId];
    if (!vote) return;
    const voter = roomParticipants[debateId]?.[userId];
    if (!voter?.side) return;
    if (agree) {
      vote.votes[userId] = true;
    } else {
      delete timeVotes[debateId];
      io.to(debateId).emit('time-change-cancelled', { reason: '참여자가 거부했습니다.' });
      return;
    }
    io.to(debateId).emit('time-change-request', { type: vote.type, votes: vote.votes, requiredCount: vote.requiredCount });
    if (Object.keys(vote.votes).length >= vote.requiredCount) {
      const voteType = vote.type;
      const savedDeadline = vote.currentDeadline;
      delete timeVotes[debateId];

      import('./src/config/supabase.js').then(async ({ supabaseAdmin }) => {
        let newDeadline;
        if (voteType === 'skip') {
          newDeadline = new Date(Date.now() + 10 * 1000).toISOString();
        } else {
          const base = savedDeadline ? new Date(savedDeadline).getTime() : Date.now();
          newDeadline = new Date(base + 5 * 60 * 1000).toISOString();
        }
        await supabaseAdmin.from('debates').update({ chat_deadline: newDeadline }).eq('id', debateId);
        io.to(debateId).emit('time-change-approved', { type: voteType, chat_deadline: newDeadline });

        // 새 deadline에 맞춰 서버 판결 타이머 재설정
        const remaining = new Date(newDeadline).getTime() - Date.now();
        if (remaining > 0) {
          setTimeout(async () => {
            try {
              const { data: d } = await supabaseAdmin.from('debates').select('status, mode').eq('id', debateId).single();
              // chat 모드: waiting/chatting 상태 모두 처리 (start-game 없이 스킵 가능)
              if (d?.mode === 'chat' && ['chatting', 'waiting', 'both_joined'].includes(d?.status)) {
                await supabaseAdmin.from('debates').update({ status: 'judging' }).eq('id', debateId);
                io.to(debateId).emit('chat-ended', { debateId });
                const { triggerJudgment } = await import('./src/services/judgmentTrigger.service.js');
                triggerJudgment(debateId).catch(err => console.error('[Skip/Extend Timer] 판결 실패:', err.message));
                console.log(`[Skip/Extend Timer] ${debateId} (status: ${d.status}) → 판결 트리거`);
              }
            } catch (err) { console.error('[Skip/Extend Timer] 에러:', err.message); }
          }, remaining);
        }
      }).catch(console.error);
    }
  });
  // ===== 소켓 끊김 시 참여자 제거 + 이탈 알림 =====
  socket.on('disconnect', () => {
  for (const debateId of Object.keys(roomParticipants)) {
    const room = roomParticipants[debateId];
    if (!room) continue;
    for (const [userId, p] of Object.entries(room)) {
      if (p.socketId !== socket.id) continue;

      const leftNickname = p.nickname;
      delete roomParticipants[debateId][userId];
      io.to(debateId).emit('presence-sync', buildSlots(debateId));
      io.to(debateId).emit('opponent-left', { userId, nickname: leftNickname });

      console.log(`[이탈] ${leftNickname}(${userId}) 이탈 감지 — 2분 후 복귀 없으면 종료`);

      // debateId, userId 클로저로 캡처
      const capturedDebateId = debateId;
      const capturedUserId = userId;

      setTimeout(async () => {
        // 2분 후 복귀 여부 확인
        const stillGone = !roomParticipants[capturedDebateId]?.[capturedUserId];
        console.log(`[이탈] 2분 경과 — 복귀 여부: ${stillGone ? '미복귀' : '복귀'}`);
        if (stillGone) {
          try {
            const { supabaseAdmin } = await import('./src/config/supabase.js');
            const { data: debate } = await supabaseAdmin
              .from('debates').select('status').eq('id', capturedDebateId).single();
            console.log(`[이탈] DB status: ${debate?.status}`);
            if (debate?.status === 'chatting') {
              await supabaseAdmin
                .from('debates').update({ status: 'judging' })
                .eq('id', capturedDebateId).eq('status', 'chatting');
              io.to(capturedDebateId).emit('chat-auto-ended', { reason: '상대방 이탈로 논쟁이 종료되었습니다.' });
              const { triggerJudgment } = await import('./src/services/judgmentTrigger.service.js');
              triggerJudgment(capturedDebateId).catch(err =>
                console.error('[이탈] 판결 실패:', err.message));
              console.log(`[이탈] ${capturedDebateId} 자동 종료 완료`);
            }
          } catch (err) { console.error('[이탈] 에러:', err.message); }
        }
      }, 2 * 60 * 1000);

      break;
    }
  }
});

});

function buildSlots(debateId) {
  const slots = { A: [], B: [] };
  if (!roomParticipants[debateId]) return slots;
  Object.values(roomParticipants[debateId]).forEach(p => {
    if (p.side === 'A') slots.A.push(p);
    if (p.side === 'B') slots.B.push(p);
  });
  return slots;
}

// ===== 보안 미들웨어 =====
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [
    env.CLIENT_URL,
    'http://localhost:5173',
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '1mb' }));


// ===== Rate Limiting (필요 시 활성화) =====
// const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } });
// const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'AI 요청 제한에 도달했습니다. 1분 후 다시 시도해주세요.' } });
// app.use('/api', globalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/debates', debateRoutes);
app.use('/api/arguments', argumentRoutes);
app.use('/api/judgments', judgmentRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/og', ogRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

httpServer.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});
