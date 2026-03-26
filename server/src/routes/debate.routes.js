import { Router } from 'express';
// import rateLimit from 'express-rate-limit';
import { createDebate, getDebate, listDebates, listChatRooms, getDebateByInviteCode, joinByInvite, getMyActiveDebates, deleteDebate, incrementView, toggleLike, getMyLikeStatus } from '../controllers/debate.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

// const viewLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: '조회 요청이 너무 많습니다.' } });

const router = Router();

router.get('/', listDebates);
router.get('/my/active', requireAuth, getMyActiveDebates);
router.get('/chat/rooms', listChatRooms);
router.get('/invite/:inviteCode', getDebateByInviteCode);
router.get('/:id', getDebate);
router.post('/', requireAuth, createDebate);
router.post('/join/:inviteCode', requireAuth, joinByInvite);
router.post('/:id/view', incrementView);
router.post('/:id/like', requireAuth, toggleLike);
router.get('/:id/like/me', requireAuth, getMyLikeStatus);
router.delete('/:id', requireAuth, deleteDebate);

export default router;