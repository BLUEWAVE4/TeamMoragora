import { supabaseAdmin } from '../config/supabase.js';

export async function submitArgument(req, res, next) {
  try {
    const { debateId } = req.params;
    const { content, side } = req.body;

    if (!content || content.length < 50 || content.length > 2000) {
      return res.status(400).json({ error: '주장은 50~2,000자여야 합니다.' });
    }

    const { data, error } = await supabaseAdmin
      .from('arguments')
      .insert({
        debate_id: debateId,
        user_id: req.user.id,
        content,
        side,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export async function getArguments(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('arguments')
      .select('*, user:profiles!user_id(nickname)')
      .eq('debate_id', req.params.debateId)
      .order('created_at');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}
