import { supabaseAdmin } from '../config/supabase.js';
import { PROFILE_HISTORY_LIMIT } from '../config/constants.js';

export async function getPublicProfile(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname, avatar_url, gender, wins, losses, draws, total_score, tier')
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
      .select('*, verdicts(*, ai_judgments(*))')
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
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
      .select('id, xp_amount, reason, reference_id, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(PROFILE_HISTORY_LIMIT);

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

// ===== 회원탈퇴 =====
export async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.id;

    // profiles 삭제 → FK CASCADE로 debates(creator), arguments, votes, comments, xp_logs 등 자동 삭제
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileErr) throw profileErr;

    // Supabase Auth 유저 삭제
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) console.error('[deleteAccount] auth 삭제 실패:', authErr.message);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// 내 프로필 간략 조회 (avatar, gender, nickname, tier)
export async function getMyProfile(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname, avatar_url, gender, age, tier, wins, losses, draws, total_score, is_onboarding_done')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
}

// 온보딩 완료 처리
export async function completeOnboarding(req, res, next) {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_onboarding_done: true })
      .eq('id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
}

// 프로필 업데이트 (nickname, gender, age, avatar_url)
export async function updateMyProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { nickname, gender, age, avatar_url } = req.body;
    const updates = {};
    if (nickname !== undefined) updates.nickname = nickname;
    if (gender !== undefined) updates.gender = gender;
    if (age !== undefined) updates.age = parseInt(age, 10);
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: '변경할 항목이 없습니다.' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;

    // auth user_metadata도 동기화
    if (nickname || gender || age) {
      const meta = {};
      if (nickname) meta.nickname = nickname;
      if (gender) meta.gender = gender;
      if (age) meta.age = parseInt(age, 10);
      await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: meta });
    }

    res.json(data);
  } catch (err) { next(err); }
}

// 내 판결 논쟁 목록 (completed/voting)
export async function getMyDebates(req, res, next) {
  try {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from('debates')
      .select('id, topic, category, status, mode, creator_id, opponent_id, created_at, pro_side, con_side, verdicts!inner(id, ai_score_a, ai_score_b, final_score_a, final_score_b, winner_side, created_at)')
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
      .in('status', ['completed', 'voting'])
      .order('created_at', { ascending: false })
      .limit(PROFILE_HISTORY_LIMIT);
    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
}

// 내 논리 분석 데이터
export async function getMyAnalysis(req, res, next) {
  try {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from('debates')
      .select('id, creator_id, verdicts!inner(ai_judgments(score_detail_a, score_detail_b))')
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
      .in('status', ['completed', 'voting'])
      .limit(PROFILE_HISTORY_LIMIT);
    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
}

export async function getRanking(_req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname, avatar_url, gender, wins, losses, draws, total_score, tier')
      .order('total_score', { ascending: false })
      .limit(PROFILE_HISTORY_LIMIT);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}
