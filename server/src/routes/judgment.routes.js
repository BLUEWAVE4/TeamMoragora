import { Router } from 'express';
import { requestJudgment, getVerdict, getVerdictFeed, getVerdictOG, getDailyVerdicts, getHallOfFame, retryJudgment, rateVerdict } from '../controllers/judgment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateUUID } from '../middleware/validate.middleware.js';

const router = Router();

router.get('/feed', getVerdictFeed);
router.get('/hall', getHallOfFame);
router.get('/daily', getDailyVerdicts);
router.get('/:debateId/og', validateUUID('debateId'), getVerdictOG);
router.get('/:debateId', validateUUID('debateId'), getVerdict);
router.post('/:debateId', validateUUID('debateId'), requireAuth, requestJudgment);
router.post('/:debateId/retry/:model', validateUUID('debateId'), requireAuth, retryJudgment);
router.post('/:debateId/rate', validateUUID('debateId'), requireAuth, rateVerdict);

export default router;
