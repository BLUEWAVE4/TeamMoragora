import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createDebate, getDebate, listDebates, getDebateByInviteCode, joinByInvite, getMyActiveDebates, deleteDebate, incrementView } from '../controllers/debate.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const viewLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: '조회 요청이 너무 많습니다.' } });

const router = Router();

router.get('/', listDebates);
router.get('/my/active', requireAuth, getMyActiveDebates);
router.get('/invite/:inviteCode', getDebateByInviteCode);
router.get('/:id', getDebate);
router.post('/', requireAuth, createDebate);
router.post('/join/:inviteCode', requireAuth, joinByInvite);
router.post('/:id/view', viewLimiter, incrementView);
router.delete('/:id', requireAuth, deleteDebate);

export default router;