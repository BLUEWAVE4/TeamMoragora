import { filterByDictionary, filterByAI, filterByGatekeeper } from '../services/contentFilter.service.js';

// 3단계 콘텐츠 방어 미들웨어
// category에 따라 적용 단계가 다름:
//   일상/연애: Stage 1만
//   직장/교육: Stage 1~2
//   사회/정치: Stage 1~3
export async function contentFilterMiddleware(req, res, next) {
  const { content, category } = req.body;

  if (!content) return next();

  // Stage 1: 비속어 사전 필터
  const dictResult = filterByDictionary(content);
  if (dictResult.blocked) {
    return res.status(400).json({
      error: '부적절한 표현이 포함되어 있습니다.',
      stage: 1,
      reason: dictResult.reason,
    });
  }

  // 일상/연애 카테고리는 Stage 1만 적용
  if (['daily', 'romance'].includes(category)) return next();

  // Stage 2: AI 콘텐츠 필터 (Gemini Flash)
  const aiResult = await filterByAI(content);
  if (aiResult.action === 'block') {
    return res.status(400).json({
      error: '유해한 콘텐츠가 감지되었습니다.',
      stage: 2,
      reason: aiResult.reason,
    });
  }

  // 직장/교육 카테고리는 Stage 2까지
  if (['work', 'education'].includes(category)) return next();

  // Stage 3: AI 게이트키퍼 (주제 적합성)
  const gateResult = await filterByGatekeeper(content, req.body.topic);
  if (gateResult.action === 'block') {
    return res.status(400).json({
      error: '주제와 관련 없는 내용입니다.',
      stage: 3,
      reason: gateResult.reason,
    });
  }

  next();
}
