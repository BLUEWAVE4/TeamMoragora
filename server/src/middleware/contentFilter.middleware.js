import { filterByDictionary, filterByAI, filterByGatekeeper } from '../services/contentFilter.service.js';
import { supabaseAdmin } from '../config/supabase.js';
import { CATEGORY_STAGE1_ONLY, CATEGORY_STAGE1_2 } from '../config/constants.js';

async function saveFilterLog({ userId, debateId, contentType, stage, reason, result, content }) {
  try {
    await supabaseAdmin.from('content_filter_logs').insert({
      user_id: userId || null,
      debate_id: debateId || null,
      content_type: contentType || 'argument',
      filter_stage: stage,
      reason: reason || null,
      result,
      blocked_text: content ? content.slice(0, 500) : null,
    });
  } catch (err) {
    console.error('[FilterLog] 저장 실패:', err.message);
  }
}

// 3단계 콘텐츠 방어 미들웨어
// category에 따라 적용 단계가 다름:
//   일상/연애: Stage 1만
//   직장/교육: Stage 1~2
//   사회/정치: Stage 1~3
export async function contentFilterMiddleware(req, res, next) {
  const { content } = req.body;

  if (!content) return next();

  // body에 category/topic이 없으면 debate에서 조회 (주장 제출 시)
  let category = req.body.category;
  let topic = req.body.topic;

  if (!category || !topic) {
    const debateId = req.params.debateId || req.body.debateId;
    if (debateId) {
      const { data: debate } = await supabaseAdmin
        .from('debates')
        .select('category, topic')
        .eq('id', debateId)
        .single();
      if (debate) {
        category = category || debate.category;
        topic = topic || debate.topic;
      }
    }
  }

  const userId = req.user?.id || null;
  const debateId = req.params.debateId || req.body.debateId || null;

  // Stage 1: 비속어 사전 필터
  const dictResult = filterByDictionary(content);
  if (dictResult.blocked) {
    saveFilterLog({ userId, debateId, contentType: 'argument', stage: 1, reason: dictResult.reason, result: 'block', content });
    return res.status(400).json({
      error: '부적절한 표현이 포함되어 있습니다.',
      stage: 1,
      reason: dictResult.reason,
    });
  }

  // 일상/연애 카테고리는 Stage 1만 적용
  if (CATEGORY_STAGE1_ONLY.includes(category)) return next();

  // Stage 2: AI 콘텐츠 필터 (GPT-4o)
  const aiResult = await filterByAI(content);
  if (aiResult.action === 'block') {
    saveFilterLog({ userId, debateId, contentType: 'argument', stage: 2, reason: aiResult.reason, result: 'block', content });
    return res.status(400).json({
      error: '유해한 콘텐츠가 감지되었습니다.',
      stage: 2,
      reason: aiResult.reason,
    });
  }

  // 직장/교육 카테고리는 Stage 2까지
  if (CATEGORY_STAGE1_2.includes(category)) return next();

  // Stage 3: AI 게이트키퍼 (주제 적합성)
  const gateResult = await filterByGatekeeper(content, topic);
  if (gateResult.action === 'block') {
    saveFilterLog({ userId, debateId, contentType: 'argument', stage: 3, reason: gateResult.reason, result: 'block', content });
    return res.status(400).json({
      error: '주제와 관련 없는 내용입니다.',
      stage: 3,
      reason: gateResult.reason,
    });
  }

  next();
}
