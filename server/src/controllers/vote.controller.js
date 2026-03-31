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
      .select('status, vote_deadline, vote_duration, created_at')
      .eq('id', debateId)
      .single();

    if (!debate) {
      return res.status(400).json({ error: '논쟁을 찾을 수 없습니다.' });
    }

    // vote_duration 기반 타이머가 아직 유효하면 투표 허용 (status와 무관)
    const hasActiveTimer = debate.vote_duration && debate.created_at &&
      new Date(new Date(debate.created_at).getTime() + debate.vote_duration * 86400000) > new Date();

    if (debate.status !== 'voting' && !hasActiveTimer) {
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

    // 투표 후 집계 갱신 + 소켓 브로드캐스트
    const { data: allVotes } = await supabaseAdmin
      .from('votes').select('voted_side').eq('debate_id', debateId);
    const tally = { A: 0, B: 0, total: (allVotes || []).length };
    (allVotes || []).forEach(v => { tally[v.voted_side]++; });

    // verdict citizen_score 즉시 갱신
    await supabaseAdmin.from('verdicts').update({
      citizen_score_a: tally.A,
      citizen_score_b: tally.B,
      citizen_vote_count: tally.total,
    }).eq('debate_id', debateId);

    // 소켓으로 실시간 집계 브로드캐스트
    const io = req.app.get('io');
    if (io) io.to(debateId).emit('vote-tally-update', tally);

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getVoteTally(req, res, next) {
  try {
    const { debateId } = req.params;

    const [{ data: debate }, { data, error }] = await Promise.all([
      supabaseAdmin.from('debates').select('status, vote_deadline').eq('id', debateId).single(),
      supabaseAdmin.from('votes').select('voted_side').eq('debate_id', debateId),
    ]);

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

// 배치 투표 상태 조회 (여러 debate 한 번에)
export async function getMyVotesBatch(req, res, next) {
  try {
    const { debateIds } = req.body;
    if (!Array.isArray(debateIds) || debateIds.length === 0) return res.json({});
    const ids = debateIds.slice(0, 50); // 최대 50개 제한

    const { data, error } = await supabaseAdmin
      .from('votes')
      .select('debate_id, voted_side')
      .eq('user_id', req.user.id)
      .in('debate_id', ids);

    if (error) throw error;
    const map = {};
    (data || []).forEach(v => { map[v.debate_id] = v.voted_side; });
    res.json(map);
  } catch (err) { next(err); }
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

    // 취소 후 집계 갱신 + 소켓 브로드캐스트
    const { data: allVotes } = await supabaseAdmin
      .from('votes').select('voted_side').eq('debate_id', debateId);
    const tally = { A: 0, B: 0, total: (allVotes || []).length };
    (allVotes || []).forEach(v => { tally[v.voted_side]++; });

    await supabaseAdmin.from('verdicts').update({
      citizen_score_a: tally.A,
      citizen_score_b: tally.B,
      citizen_vote_count: tally.total,
    }).eq('debate_id', debateId);

    const io = req.app.get('io');
    if (io) io.to(debateId).emit('vote-tally-update', tally);

    res.json({ message: '투표가 취소되었습니다.' });
  } catch (err) {
    next(err);
  }
}

// 마감된 투표 일괄 확정 (cron 또는 수동 호출용)
export async function finalizeExpiredVotes(_req, res, next) {
  try {
    // vote_deadline이 지난 논쟁 + vote_deadline이 null인 오래된 논쟁 모두 처리
    const now = new Date().toISOString();
    const { data: expiredByDeadline } = await supabaseAdmin
      .from('debates')
      .select('id')
      .eq('status', 'voting')
      .not('vote_deadline', 'is', null)
      .lt('vote_deadline', now);

    const { data: noDeadline } = await supabaseAdmin
      .from('debates')
      .select('id, created_at, vote_duration')
      .eq('status', 'voting')
      .is('vote_deadline', null);

    // vote_deadline이 null인 경우 created_at + vote_duration으로 판단
    const expiredNoDeadline = (noDeadline || []).filter(d => {
      const duration = d.vote_duration ?? 1;
      const deadline = new Date(new Date(d.created_at).getTime() + duration * 86400000);
      return new Date() > deadline;
    });

    const expired = [...(expiredByDeadline || []), ...expiredNoDeadline];

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
