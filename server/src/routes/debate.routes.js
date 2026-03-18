import { Router } from 'express';
import { createDebate, getDebate, listDebates, getDebateByInviteCode, joinByInvite, getMyActiveDebates, deleteDebate, incrementView } from '../controllers/debate.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', listDebates);
router.get('/my/active', requireAuth, getMyActiveDebates);
router.get('/invite/:inviteCode', getDebateByInviteCode);
router.get('/:id', getDebate);
router.post('/', requireAuth, createDebate);
router.post('/join/:inviteCode', requireAuth, joinByInvite);
router.post('/:id/view', incrementView);
router.delete('/:id', requireAuth, deleteDebate);

export default router;