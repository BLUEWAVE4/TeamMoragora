import { supabaseAdmin } from '../config/supabase.js';
import { finalizeVerdict } from '../services/verdict.service.js';
// 투표 XP는 마감 후 verdict.service에서 적중/미적중 정산

export async function castVote(req, res, next) {
  try {
    const { debateId } = req.params;
    const { voted_side } = req.body;

    // 0. voted_side 유효성 검증
    if (!['A', 'B'].includes(voted_side)) {
      return res.status(400).json({ error: 'voted_side는 A 또는 B만 가능합니다.' });
    }

    // 1. 투표 가능 상태인지 확인
    const { data: debate } = await supabaseAdmin
      .from('debates')
      .select('status, vote_deadline')
      .eq('id', debateId)
      .single();

    if (!debate || debate.status !== 'voting') {
      return res.status(400).json({ error: '투표 기간이 아닙니다.' });
    }

    // 2. 마감 시간 초과 체크
    if (debate.vote_deadline && new Date(debate.vote_deadline) < new Date()) {
      // 마감됨 → 자동으로 최종 판결 확정
      const result = await finalizeVerdict(debateId);
      return res.status(400).json({ error: '투표가 마감되었습니다.', result });
    }

    // 3. 투표 저장
    const { data, error } = await supabaseAdmin
      .from('votes')
      .upsert(
        { debate_id: debateId, user_id: req.user.id, voted_side },
        { onConflict: 'debate_id,user_id' }
      )
      .select()
      .single();

    if (error) throw error;

    // 투표 XP는 마감 후 적중/미적중으로 정산 (참여 즉시 지급 없음)

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getVoteTally(req, res, next) {
  try {
    const { debateId } = req.params;

    const { data: debate } = await supabaseAdmin
      .from('debates')
      .select('status, vote_deadline')
      .eq('id', debateId)
      .single();

    const { data, error } = await supabaseAdmin
      .from('votes')
      .select('voted_side')
      .eq('debate_id', debateId);

    if (error) throw error;

    const tally = { A: 0, B: 0, total: data.length };
    data.forEach((v) => { tally[v.voted_side]++; });

    res.json({
      ...tally,
      status: debate?.status,
      vote_deadline: debate?.vote_deadline,
    });
  } catch (err) {
    next(err);
  }
}

// 내 투표 조회
export async function getMyVote(req, res, next) {
  try {
    const { debateId } = req.params;
    const { data, error } = await supabaseAdmin
      .from('votes')
      .select('voted_side')
      .eq('debate_id', debateId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    res.json({ voted_side: data?.voted_side || null });
  } catch (err) {
    next(err);
  }
}

// 투표 취소
export async function cancelVote(req, res, next) {
  try {
    const { debateId } = req.params;

    // 1. 투표 가능 상태인지 확인
    const { data: debate } = await supabaseAdmin
      .from('debates')
      .select('status')
      .eq('id', debateId)
      .single();

    if (!debate || debate.status !== 'voting') {
      return res.status(400).json({ error: '투표 기간이 아닙니다.' });
    }

    // 2. 투표 삭제
    const { error } = await supabaseAdmin
      .from('votes')
      .delete()
      .eq('debate_id', debateId)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: '투표가 취소되었습니다.' });
  } catch (err) {
    next(err);
  }
}

// 마감된 투표 일괄 확정 (cron 또는 수동 호출용)
export async function finalizeExpiredVotes(_req, res, next) {
  try {
    const { data: expired } = await supabaseAdmin
      .from('debates')
      .select('id')
      .eq('status', 'voting')
      .lt('vote_deadline', new Date().toISOString());

    const results = [];
    for (const debate of (expired || [])) {
      const result = await finalizeVerdict(debate.id);
      results.push({ debateId: debate.id, ...result });
    }

    res.json({ finalized: results.length, results });
  } catch (err) {
    next(err);
  }
}
