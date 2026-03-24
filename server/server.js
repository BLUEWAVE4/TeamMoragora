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
  socket.on('join-presence', ({ debateId, userId, nickname, side }) => {
    if (!roomParticipants[debateId]) roomParticipants[debateId] = {};
    // 기존 참여자면 socketId만 갱신 (ready, side 유지)
    if (roomParticipants[debateId][userId]) {
      roomParticipants[debateId][userId].socketId = socket.id;
      roomParticipants[debateId][userId].nickname = nickname;
    } else {
      roomParticipants[debateId][userId] = { userId, nickname, side: side || null, ready: false, socketId: socket.id };
    }
    const slots = buildSlots(debateId);
    io.to(debateId).emit('presence-sync', slots);
  });

  // ===== Presence: 사이드 선택 =====
  socket.on('select-side', ({ debateId, userId, nickname, side, ready }) => {
    if (roomParticipants[debateId]?.[userId]) {
      roomParticipants[debateId][userId].side = side;
      roomParticipants[debateId][userId].nickname = nickname;
      roomParticipants[debateId][userId].ready = ready || false;
    }
    io.to(debateId).emit('presence-sync', buildSlots(debateId));
  });

  // ===== Presence: 퇴장 =====
  socket.on('leave-presence', ({ debateId, userId }) => {
    if (roomParticipants[debateId]) {
      delete roomParticipants[debateId][userId];
      io.to(debateId).emit('presence-sync', buildSlots(debateId));
    }
  });

  // ===== 타이핑 인디케이터 =====
  socket.on('typing', ({ debateId, userId, typing }) => {
    socket.to(debateId).emit('opponent-typing', typing);
  });

  // ===== 게임 시작 (서버가 시간 관리) =====
  socket.on('start-game', async ({ debateId }) => {
    const CHAT_DURATION_MS = 3 * 60 * 1000; // 3분
    const now = new Date();
    const chat_deadline = new Date(now.getTime() + CHAT_DURATION_MS).toISOString();
    const chat_started_at = now.toISOString();

    // 양쪽에 서버 기준 deadline 전달
    io.to(debateId).emit('game-start', { chat_deadline, chat_started_at });

    // DB 저장
    import('./src/config/supabase.js').then(({ supabaseAdmin }) => {
      supabaseAdmin.from('debates').update({ chat_deadline, chat_started_at, status: 'chatting' }).eq('id', debateId);
    }).catch(() => {});

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

  // ===== 실시간 메시지: 즉시 브로드캐스트 → DB 비동기 저장 =====
  socket.on('send-message', async (payload) => {
    const { debateId, userId, nickname, content, side } = payload;
    if (!debateId || !userId || !content?.trim() || !side) return;

    const msgId = crypto.randomUUID();
    const now = new Date().toISOString();
    const msg = { id: msgId, debate_id: debateId, user_id: userId, nickname, content: content.trim(), side, created_at: now };

    io.to(debateId).emit('new-message', msg);

    import('./src/config/supabase.js').then(({ supabaseAdmin }) => {
      supabaseAdmin.from('chat_messages').insert(msg).then(({ error }) => {
        if (error) console.error('[Socket] DB 저장 실패:', error.message);
      });
    }).catch(() => {});
  });

socket.on('request-time-change', ({ debateId, userId, type, currentDeadline }) => {
  const slots = buildSlots(debateId);
  const total = [...slots.A, ...slots.B].length;
  timeVotes[debateId] = { type, votes: { [userId]: true }, requiredCount: total, currentDeadline };
  io.to(debateId).emit('time-change-request', { type, requesterId: userId, votes: { [userId]: true }, requiredCount: total });
});

socket.on('vote-time-change', ({ debateId, userId, agree }) => {
  const vote = timeVotes[debateId];
  if (!vote) return;
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
  delete timeVotes[debateId];

  // 서버에서 deadline 계산
  import('./src/config/supabase.js').then(async ({ supabaseAdmin }) => {
    let newDeadline;
    if (voteType === 'skip') {
      newDeadline = new Date(Date.now() + 10 * 1000).toISOString();
    } else {
      // DB 대신 현재 서버 시각 기준으로 참여자들의 남은 시간을 알 수 없으므로
      // 클라이언트가 현재 deadline을 payload로 보내게 변경
      const currentDeadline = timeVotes[debateId]?.currentDeadline;
      const base = currentDeadline ? new Date(currentDeadline).getTime() : Date.now();
      newDeadline = new Date(base + 5 * 60 * 1000).toISOString();
    }
    await supabaseAdmin.from('debates').update({ chat_deadline: newDeadline }).eq('id', debateId);
    // deadline 포함해서 broadcast
    io.to(debateId).emit('time-change-approved', { type: voteType, chat_deadline: newDeadline });
  }).catch(console.error);
}
});
  // ===== 소켓 끊김 시 참여자 제거 =====
  socket.on('disconnect', () => {
    for (const debateId of Object.keys(roomParticipants)) {
      for (const [userId, p] of Object.entries(roomParticipants[debateId])) {
        if (p.socketId === socket.id) {
          delete roomParticipants[debateId][userId];
          io.to(debateId).emit('presence-sync', buildSlots(debateId));
          break;
        }
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