import { supabaseAdmin } from '../config/supabase.js';
import { filterByDictionary, filterByAI } from '../services/contentFilter.service.js';
import { CATEGORY_ALL_STAGES } from '../config/constants.js';

// 필터 로그를 DB에 저장하는 헬퍼
async function saveFilterLog({ userId, debateId, contentType, stage, blocked, reason, result }) {
  try {
    await supabaseAdmin.from('content_filter_logs').insert({
      user_id: userId,
      debate_id: debateId || null,
      content_type: contentType || 'check',
      filter_stage: stage,
      reason: reason || null,
      result: result || (blocked ? 'block' : 'pass'),
    });
  } catch (err) {
    console.error('[FilterLog] 저장 실패:', err.message);
  }
}

export async function checkContent(req, res, next) {
  try {
    const { content, category, debateId } = req.body;
    const userId = req.user?.id;

    // Stage 1: 비속어 사전
    const dictResult = filterByDictionary(content);
    if (dictResult.blocked) {
      if (userId) await saveFilterLog({ userId, debateId, contentType: 'check', stage: 1, blocked: true, reason: dictResult.reason, result: 'block' });
      return res.json({ pass: false, stage: 1, reason: dictResult.reason });
    }

    // Stage 2: AI 유해성 필터 (사회/정치 카테고리)
    if (CATEGORY_ALL_STAGES.includes(category)) {
      const aiResult = await filterByAI(content);
      if (aiResult.action === 'block') {
        if (userId) await saveFilterLog({ userId, debateId, contentType: 'check', stage: 2, blocked: true, reason: aiResult.reason, result: 'block' });
        return res.json({ pass: false, stage: 2, reason: aiResult.reason });
      }
    }

    res.json({ pass: true });
  } catch (err) {
    next(err);
  }
}

export async function getFilterLogs(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('content_filter_logs')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}
