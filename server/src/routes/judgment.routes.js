import { Router } from 'express';
import { requestJudgment, getVerdict, getVerdictFeed, getVerdictOG, getDailyVerdicts, getHallOfFame, retryJudgment, rateVerdict } from '../controllers/judgment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/feed', getVerdictFeed);
router.get('/hall', getHallOfFame);
router.get('/daily', getDailyVerdicts);
router.get('/:debateId/og', getVerdictOG);
router.get('/:debateId', getVerdict);
router.post('/:debateId', requireAuth, requestJudgment);
router.post('/:debateId/retry/:model', requireAuth, retryJudgment);
router.post('/:debateId/rate', requireAuth, rateVerdict);

export default router;
