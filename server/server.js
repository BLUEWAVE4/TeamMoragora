import 'dotenv/config';
import express from 'express';
import cors from 'cors';

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
import { errorHandler } from './src/middleware/errorHandler.js';

const app = express();

// Middleware
app.use(cors({
  origin: [
    env.CLIENT_URL,
    'http://localhost:5173',
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});