import { Router } from 'express';
import { getPublicProfile, getMyVerdicts, getMyXPLogs, getRanking, deleteMyDebate } from '../controllers/profile.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/ranking', getRanking);
router.get('/me/verdicts', requireAuth, getMyVerdicts);
router.delete('/me/verdicts/:debateId', requireAuth, deleteMyDebate);
router.get('/me/xp-logs', requireAuth, getMyXPLogs);
router.get('/:userId', getPublicProfile);

export default router;
