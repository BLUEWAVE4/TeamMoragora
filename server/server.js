import 'dotenv/config';
import express from 'express';
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

// ===== Rate Limiting =====
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'AI 요청 제한에 도달했습니다. 1분 후 다시 시도해주세요.' } });
app.use('/api', globalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/debates', debateRoutes);
app.use('/api/arguments', argumentRoutes);
app.use('/api/judgments', aiLimiter, judgmentRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/og', ogRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
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

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});