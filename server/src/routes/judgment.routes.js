import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requestJudgment, getVerdict, getVerdictFeed, getVerdictOG, getDailyVerdicts, getHallOfFame, retryJudgment, rateVerdict } from '../controllers/judgment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'AI 요청 제한에 도달했습니다. 1분 후 다시 시도해주세요.' } });

const router = Router();

router.get('/feed', getVerdictFeed);
router.get('/hall', getHallOfFame);
router.get('/daily', getDailyVerdicts);
router.get('/:debateId/og', getVerdictOG);
router.get('/:debateId', getVerdict);
router.post('/:debateId', requireAuth, aiLimiter, requestJudgment);
router.post('/:debateId/retry/:model', requireAuth, aiLimiter, retryJudgment);
router.post('/:debateId/rate', requireAuth, rateVerdict);

export default router;
