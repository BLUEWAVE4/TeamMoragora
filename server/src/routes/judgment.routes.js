import { Router } from 'express';
import { requestJudgment, getVerdict, getVerdictFeed, getVerdictOG, getDailyVerdicts, getHallOfFame } from '../controllers/judgment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/feed', getVerdictFeed);
router.get('/hall', getHallOfFame);
router.get('/daily', getDailyVerdicts);
router.get('/:debateId/og', getVerdictOG);
router.get('/:debateId', getVerdict);
router.post('/:debateId', requireAuth, requestJudgment);

export default router;
