import { supabaseAdmin } from '../config/supabase.js';
import { filterByDictionary, filterByAI } from '../services/contentFilter.service.js';

export async function checkContent(req, res, next) {
  try {
    const { content, category } = req.body;

    const dictResult = filterByDictionary(content);
    if (dictResult.blocked) {
      return res.json({ pass: false, stage: 1, reason: dictResult.reason });
    }

    if (['social', 'politics'].includes(category)) {
      const aiResult = await filterByAI(content);
      if (aiResult.action === 'block') {
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
