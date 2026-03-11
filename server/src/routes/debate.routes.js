import { Router } from 'express';
import { createDebate, getDebate, listDebates, getDebateByInviteCode, joinByInvite } from '../controllers/debate.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', listDebates);
router.get('/invite/:inviteCode', requireAuth, getDebateByInviteCode);
router.get('/:id', getDebate);
router.post('/', requireAuth, createDebate);
router.post('/join/:inviteCode', requireAuth, joinByInvite);

export default router;