import { Router } from 'express';
import { createDebate, getDebate, listDebates, listChatRooms, getDebateByInviteCode, joinByInvite, getMyActiveDebates, deleteDebate, incrementView, toggleLike, getMyLikeStatus } from '../controllers/debate.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateUUID } from '../middleware/validate.middleware.js';

const router = Router();

router.get('/', listDebates);
router.get('/my/active', requireAuth, getMyActiveDebates);
router.get('/chat/rooms', listChatRooms);
router.get('/invite/:inviteCode', getDebateByInviteCode);
router.get('/:id', validateUUID('id'), getDebate);
router.post('/', requireAuth, createDebate);
router.post('/join/:inviteCode', requireAuth, joinByInvite);
router.post('/:id/view', validateUUID('id'), incrementView);
router.post('/:id/like', validateUUID('id'), requireAuth, toggleLike);
router.get('/:id/like/me', validateUUID('id'), requireAuth, getMyLikeStatus);
router.delete('/:id', validateUUID('id'), requireAuth, deleteDebate);

export default router;