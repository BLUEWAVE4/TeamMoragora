import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { env } from './src/config/env.js';
import { initializeSocket, initializePresentationSocket } from './src/socket/index.js';
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
import analyticsRoutes from './src/routes/analytics.routes.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { supabaseAdmin } from './src/config/supabase.js';

const app = express();
const httpServer = createServer(app);

// ===== Socket.io =====
const corsOrigins = [env.CLIENT_URL, 'http://localhost:5173'].filter(Boolean);
export const io = new Server(httpServer, {
  cors: { origin: corsOrigins, credentials: true },
});

// ===== Socket.io 핸들러 초기화 =====
const { roomParticipants, kickedUsers, cleanupDebateRoom, buildSlots } = initializeSocket(io);
initializePresentationSocket(io);

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


// ===== Rate Limiting (개발 중 임시 비활성화) =====
// const isDev = env.PORT === 5000 || process.env.NODE_ENV === 'development';
// const globalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: isDev ? 3000 : 300,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
// });
// const authLimiter = rateLimit({
//   windowMs: 60 * 1000,
//   max: 10,
//   message: { error: '인증 요청이 너무 많습니다. 1분 후 다시 시도해주세요.' },
// });
// const aiLimiter = rateLimit({
//   windowMs: 60 * 1000,
//   max: 5,
//   message: { error: 'AI 요청 제한에 도달했습니다. 1분 후 다시 시도해주세요.' },
// });
// app.use('/api', globalLimiter);

// io를 controller에서 접근 가능하도록 app에 연결
app.set('io', io);

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
app.use('/api/analytics', analyticsRoutes);

// 실시간 참여자 조회 (피드용)
app.get('/api/rooms/participants', (_req, res) => {
  const result = {};
  for (const [debateId, room] of Object.entries(roomParticipants)) {
    const slots = { A: [], B: [], citizen: [] };
    Object.values(room).forEach(p => {
      const { socketIds, _gameStarted, ...safe } = p;
      if (p.side === 'A') slots.A.push(safe);
      else if (p.side === 'B') slots.B.push(safe);
      else if (p._isCitizen) slots.citizen.push(safe);
    });
    slots.A.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    slots.B.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    result[debateId] = slots;
  }
  res.json(result);
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 디버그: DB 업데이트 테스트
app.post('/api/debug/force-chatting/:debateId', async (req, res) => {
  try {
    const { debateId } = req.params;
    const now = new Date();
    const deadline = new Date(now.getTime() + 15 * 60 * 1000 + 7000).toISOString();
    const { data, error } = await supabaseAdmin
      .from('debates')
      .update({ status: 'chatting', chat_deadline: deadline, chat_started_at: now.toISOString() })
      .eq('id', debateId)
      .select('id, status, chat_deadline');
    if (error) return res.status(500).json({ error: error.message, code: error.code });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error handler
app.use(errorHandler);

httpServer.listen(env.PORT, async () => {
  console.log(`Server running on http://localhost:${env.PORT}`);

  // ===== 서버 재시작 시 chatting 상태 논쟁 타이머 복구 =====
  try {
    const { data: chattingDebates } = await supabaseAdmin
      .from('debates')
      .select('id, chat_deadline')
      .eq('status', 'chatting')
      .not('chat_deadline', 'is', null);

    for (const debate of chattingDebates || []) {
      const remaining = new Date(debate.chat_deadline).getTime() - Date.now();
      if (remaining <= 0) {
        // 이미 만료 — 즉시 처리
        const { count } = await supabaseAdmin.from('chat_messages').select('id', { count: 'exact', head: true }).eq('debate_id', debate.id);
        if (!count || count === 0) {
          await supabaseAdmin.from('debates').delete().eq('id', debate.id);
          console.log(`[Recovery] ${debate.id} 만료+메시지없음 → 삭제`);
        } else {
          await supabaseAdmin.from('debates').update({ status: 'judging' }).eq('id', debate.id).eq('status', 'chatting');
          const { triggerJudgment } = await import('./src/services/judgmentTrigger.service.js');
          triggerJudgment(debate.id).catch(err => console.error('[Recovery] 판결 실패:', err.message));
          console.log(`[Recovery] ${debate.id} 만료 → 판결 트리거`);
        }
      } else {
        // 아직 남은 시간 — 타이머 재설정
        setTimeout(async () => {
          try {
            const { data: d } = await supabaseAdmin.from('debates').select('status').eq('id', debate.id).single();
            if (d?.status !== 'chatting') return;
            const { count } = await supabaseAdmin.from('chat_messages').select('id', { count: 'exact', head: true }).eq('debate_id', debate.id);
            if (!count || count === 0) {
              await supabaseAdmin.from('debates').delete().eq('id', debate.id);
              io.to(debate.id).emit('chat-cancelled', { reason: '채팅 내용이 없어 논쟁이 취소되었습니다.' });
              cleanupDebateRoom(debate.id);
              console.log(`[RecoveryTimer] ${debate.id} 메시지 없음 → 삭제`);
            } else {
              await supabaseAdmin.from('debates').update({ status: 'judging' }).eq('id', debate.id).eq('status', 'chatting');
              io.to(debate.id).emit('chat-ended', { debateId: debate.id });
              cleanupDebateRoom(debate.id);
              const { triggerJudgment } = await import('./src/services/judgmentTrigger.service.js');
              triggerJudgment(debate.id).catch(err => console.error('[RecoveryTimer] 판결 실패:', err.message));
              console.log(`[RecoveryTimer] ${debate.id} 채팅 종료 → 판결 트리거`);
            }
          } catch (err) { console.error('[RecoveryTimer] 에러:', err.message); }
        }, remaining);
        console.log(`[Recovery] ${debate.id} 타이머 복구 (${Math.round(remaining / 1000)}초 남음)`);
      }
    }

    // 강퇴 기록 메모리 캐시 워밍
    const { data: kicks } = await supabaseAdmin.from('kicked_users').select('debate_id, user_id');
    for (const k of kicks || []) {
      if (!kickedUsers[k.debate_id]) kickedUsers[k.debate_id] = new Set();
      kickedUsers[k.debate_id].add(k.user_id);
    }
    if (kicks?.length) console.log(`[Recovery] 강퇴 기록 ${kicks.length}건 메모리 로드`);
  } catch (err) {
    console.error('[Recovery] 초기화 실패:', err.message);
  }
});

// 미처리 Promise 거부 시 서버 크래시 방지
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});
