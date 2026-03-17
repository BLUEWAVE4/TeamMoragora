import { supabaseAdmin } from '../config/supabase.js';

export async function getPublicProfile(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname, avatar_url, gender, wins, losses, draws, total_score, xp, tier')
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

export async function getMyXPLogs(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('xp_logs')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// 논쟁 삭제 (본인이 creator 또는 opponent인 경우만)
export async function deleteMyDebate(req, res, next) {
  try {
    const userId = req.user.id;
    const { debateId } = req.params;

    // 본인 참여 논쟁인지 확인
    const { data: debate, error: findErr } = await supabaseAdmin
      .from('debates')
      .select('id, creator_id, opponent_id')
      .eq('id', debateId)
      .single();

    if (findErr || !debate) {
      return res.status(404).json({ error: '논쟁을 찾을 수 없습니다.' });
    }

    if (debate.creator_id !== userId && debate.opponent_id !== userId) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    // CASCADE로 verdicts, arguments, votes 등 자동 삭제
    const { error: delErr } = await supabaseAdmin
      .from('debates')
      .delete()
      .eq('id', debateId);

    if (delErr) throw delErr;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getRanking(_req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname, avatar_url, gender, wins, losses, draws, total_score, xp, tier')
      .order('total_score', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}
