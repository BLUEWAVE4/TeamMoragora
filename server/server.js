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

io.on('connection', (socket) => {
  socket.on('join-room', (debateId) => socket.join(debateId));
  socket.on('leave-room', (debateId) => socket.leave(debateId));

  // ===== Presence: 참여자 입장 =====
  socket.on('join-presence', ({ debateId, userId, nickname, side }) => {
    if (!roomParticipants[debateId]) roomParticipants[debateId] = {};
    roomParticipants[debateId][userId] = { userId, nickname, side, socketId: socket.id };
    const slots = buildSlots(debateId);
    io.to(debateId).emit('presence-sync', slots);
  });

  // ===== Presence: 사이드 선택 =====
  socket.on('select-side', ({ debateId, userId, nickname, side }) => {
    if (roomParticipants[debateId]?.[userId]) {
      roomParticipants[debateId][userId].side = side;
      roomParticipants[debateId][userId].nickname = nickname;
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

  // ===== 게임 시작 =====
  socket.on('start-game', async ({ debateId, chat_deadline }) => {
    io.to(debateId).emit('game-start', { chat_deadline });
    // DB 업데이트 (비동기)
    import('./src/config/supabase.js').then(({ supabaseAdmin }) => {
      supabaseAdmin.from('debates').update({ chat_deadline, chat_started_at: new Date().toISOString(), status: 'chatting' }).eq('id', debateId);
    }).catch(() => {});
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
  const slots = { A: null, B: null };
  if (!roomParticipants[debateId]) return slots;
  Object.values(roomParticipants[debateId]).forEach(p => {
    if (p.side === 'A') slots.A = p;
    if (p.side === 'B') slots.B = p;
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