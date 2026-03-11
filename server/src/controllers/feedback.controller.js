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
      if (!val || val < 1 || val > 5) {
        return res.status(400).json({ error: `${key}는 1~5 사이 값이어야 합니다.` });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('feedbacks')
      .insert({
        user_id: req.user.id,
        satisfaction,
        ai_accuracy,
        ui_ease,
        fairness,
        recommend,
        best_feature: best_feature || null,
        improvement: improvement || null,
        additional: additional || null,
      })
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
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}
