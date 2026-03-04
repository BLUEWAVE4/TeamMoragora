import { supabaseAdmin } from '../config/supabase.js';

export async function getPublicProfile(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname, avatar_url, wins, losses, draws, total_score')
      .eq('id', req.params.userId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getMyVerdicts(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from('debates')
      .select('*, verdicts(*)')
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getRanking(_req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname, avatar_url, wins, losses, draws, total_score')
      .order('total_score', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}
