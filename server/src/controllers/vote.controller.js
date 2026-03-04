import { supabaseAdmin } from '../config/supabase.js';

export async function castVote(req, res, next) {
  try {
    const { debateId } = req.params;
    const { voted_side } = req.body;

    const { data, error } = await supabaseAdmin
      .from('votes')
      .upsert(
        { debate_id: debateId, user_id: req.user.id, voted_side },
        { onConflict: 'debate_id,user_id' }
      )
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getVoteTally(req, res, next) {
  try {
    const { debateId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('votes')
      .select('voted_side')
      .eq('debate_id', debateId);

    if (error) throw error;

    const tally = { A: 0, B: 0, total: data.length };
    data.forEach((v) => { tally[v.voted_side]++; });

    res.json(tally);
  } catch (err) {
    next(err);
  }
}
