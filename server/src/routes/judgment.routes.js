import { Router } from 'express';
import { requestJudgment, getVerdict, getVerdictFeed, getVerdictOG, getDailyVerdicts, getHallOfFame, retryJudgment, rateVerdict } from '../controllers/judgment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateUUID } from '../middleware/validate.middleware.js';

// ===== Rate Limiting (개발 중 임시 비활성화) =====
// const aiLimiter = rateLimit({
//   windowMs: 60 * 1000,
//   max: 5,
//   message: { error: 'AI 요청 제한에 도달했습니다. 1분 후 다시 시도해주세요.' },
// });

const router = Router();

// GET — 판결 조회
router.get('/feed', getVerdictFeed);
router.get('/hall', getHallOfFame);
router.get('/daily', getDailyVerdicts);
router.get('/:debateId/og', validateUUID('debateId'), getVerdictOG);
router.get('/:debateId', validateUUID('debateId'), getVerdict);

// POST — AI 호출
router.post('/:debateId', validateUUID('debateId'), requireAuth, requestJudgment);
router.post('/:debateId/retry/:model', validateUUID('debateId'), requireAuth, retryJudgment);
router.post('/:debateId/rate', validateUUID('debateId'), requireAuth, rateVerdict);

export default router;
