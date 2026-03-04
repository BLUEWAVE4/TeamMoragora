import { Router } from 'express';
import { getPublicProfile, getMyVerdicts, getRanking } from '../controllers/profile.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/ranking', getRanking);
router.get('/me/verdicts', requireAuth, getMyVerdicts);
router.get('/:userId', getPublicProfile);

export default router;
