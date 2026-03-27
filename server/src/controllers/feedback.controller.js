import { supabaseAdmin } from '../config/supabase.js';

export async function submitFeedback(req, res, next) {
  try {
    const {
      satisfaction, ai_accuracy, ui_ease, fairness, recommend,
      best_feature, improvement, additional,
    } = req.body;

    // 필수 항목 검증
    const scores = { satisfaction, ai_accuracy, ui_ease, fairness, recommend };
    for (const [key, val] of Object.entries(scores)) {
      if (!val || val < 0.5 || val > 5 || (val * 2) % 1 !== 0) {
        return res.status(400).json({ error: `${key}는 0.5~5 사이 0.5 단위 값이어야 합니다.` });
      }
    }

    const payload = {
      user_id: req.user.id,
      satisfaction,
      ai_accuracy,
      ui_ease,
      fairness,
      recommend,
      best_feature: best_feature || null,
      improvement: improvement || null,
      additional: additional || null,
    };

    // upsert: 기존 피드백 있으면 수정, 없으면 새로 생성
    const { data, error } = await supabaseAdmin
      .from('feedbacks')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export async function getMyFeedbacks(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('feedbacks')
      .select('id, satisfaction, ai_accuracy, ui_ease, fairness, recommend, best_feature, improvement, additional, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}
