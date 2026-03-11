import { supabaseAdmin } from '../config/supabase.js';

// 복합 판결 계산: AI 판결 즉시 저장 (시민 투표는 마감 후 합산)
export async function calculateCompositeVerdict(debateId, judgments) {
  // 1. AI 점수 평균
  const aiScoreA = avg(judgments.map((j) => j.score_a));
  const aiScoreB = avg(judgments.map((j) => j.score_b));

  // 승자 결정 (다수결)
  const winnerVotes = { A: 0, B: 0, draw: 0 };
  judgments.forEach((j) => { winnerVotes[j.winner_side]++; });
  const aiWinner = winnerVotes.A > winnerVotes.B ? 'A'
    : winnerVotes.B > winnerVotes.A ? 'B' : 'draw';

  // 종합 요약 (첫 번째 성공한 AI의 verdict_text 사용)
  const summary = judgments[0]?.verdict_text || '';

  // 2. verdicts 테이블 저장 (AI 결과만, 시민 투표는 아직 미반영)
  const { data: verdict, error: vErr } = await supabaseAdmin
    .from('verdicts')
    .insert({
      debate_id: debateId,
      winner_side: aiWinner,
      summary,
      ai_score_a: aiScoreA,
      ai_score_b: aiScoreB,
      citizen_score_a: null,
      citizen_score_b: null,
      final_score_a: aiScoreA,
      final_score_b: aiScoreB,
      is_citizen_applied: false,
    })
    .select()
    .single();

  if (vErr) throw vErr;

  // 3. ai_judgments 테이블 저장
  const aiRows = judgments.map((j) => ({
    verdict_id: verdict.id,
    ai_model: j.ai_model,
    winner_side: j.winner_side,
    verdict_text: j.verdict_text,
    score_a: j.score_a,
    score_b: j.score_b,
    score_detail_a: j.score_detail_a,
    score_detail_b: j.score_detail_b,
    confidence: j.confidence,
  }));

  await supabaseAdmin.from('ai_judgments').insert(aiRows);

  return { ...verdict, ai_judgments: aiRows };
}

// 투표 마감 후 시민 투표 합산 + 최종 판결 확정
export async function finalizeVerdict(debateId) {
  const { data: votes } = await supabaseAdmin
    .from('votes')
    .select('voted_side')
    .eq('debate_id', debateId);

  const { data: verdict } = await supabaseAdmin
    .from('verdicts')
    .select('id, ai_score_a, ai_score_b')
    .eq('debate_id', debateId)
    .single();

  if (!verdict) throw new Error('판결 데이터가 없습니다.');

  // AI 개별 점수 조회 (3사 각 25%)
  const { data: aiJudgments } = await supabaseAdmin
    .from('ai_judgments')
    .select('score_a, score_b')
    .eq('verdict_id', verdict.id);

  let finalA = verdict.ai_score_a;
  let finalB = verdict.ai_score_b;
  let citizenApplied = false;
  let citizenScoreA = null;
  let citizenScoreB = null;

  // 시민 투표 30명 이상이면 합산
  if (votes && votes.length >= 30) {
    const countA = votes.filter((v) => v.voted_side === 'A').length;
    const countB = votes.filter((v) => v.voted_side === 'B').length;
    const total = votes.length;

    citizenScoreA = Math.round((countA / total) * 100);
    citizenScoreB = Math.round((countB / total) * 100);

    // AI 75% (평균) + 시민 25%
    if (aiJudgments && aiJudgments.length > 0) {
      const aiAvgA = aiJudgments.reduce((sum, j) => sum + j.score_a, 0) / aiJudgments.length;
      const aiAvgB = aiJudgments.reduce((sum, j) => sum + j.score_b, 0) / aiJudgments.length;
      finalA = Math.round(aiAvgA * 0.75 + citizenScoreA * 0.25);
      finalB = Math.round(aiAvgB * 0.75 + citizenScoreB * 0.25);
    } else {
      finalA = Math.round(verdict.ai_score_a * 0.75 + citizenScoreA * 0.25);
      finalB = Math.round(verdict.ai_score_b * 0.75 + citizenScoreB * 0.25);
    }
    citizenApplied = true;
  }

  const finalWinner = finalA > finalB ? 'A' : finalB > finalA ? 'B' : 'draw';

  // verdicts 업데이트
  await supabaseAdmin
    .from('verdicts')
    .update({
      citizen_score_a: citizenScoreA,
      citizen_score_b: citizenScoreB,
      final_score_a: finalA,
      final_score_b: finalB,
      winner_side: finalWinner,
      is_citizen_applied: citizenApplied,
      citizen_vote_count: votes?.length || 0,
    })
    .eq('debate_id', debateId);

  // debates 상태를 completed로
  await supabaseAdmin
    .from('debates')
    .update({ status: 'completed' })
    .eq('id', debateId);

  // 프로필 전적 업데이트 (wins/losses/draws + total_score)
  await updateProfileStats(debateId, finalWinner, finalA, finalB);

  return { finalA, finalB, finalWinner, citizenApplied, voterCount: votes?.length || 0 };
}

// 프로필 전적 + total_score 업데이트
async function updateProfileStats(debateId, finalWinner, finalA, finalB) {
  const { data: debate } = await supabaseAdmin
    .from('debates')
    .select('creator_id, opponent_id')
    .eq('id', debateId)
    .single();

  if (!debate || !debate.opponent_id) return;

  const creatorSide = 'A';  // creator는 항상 A측
  const opponentSide = 'B';

  const creatorResult = finalWinner === creatorSide ? 'win'
    : finalWinner === opponentSide ? 'loss' : 'draw';
  const opponentResult = finalWinner === opponentSide ? 'win'
    : finalWinner === creatorSide ? 'loss' : 'draw';

  await Promise.all([
    applyResult(debate.creator_id, creatorResult, finalA),
    applyResult(debate.opponent_id, opponentResult, finalB),
  ]);
}

async function applyResult(userId, result, score) {
  // 현재 프로필 조회
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('wins, losses, draws, total_score')
    .eq('id', userId)
    .single();

  if (!profile) return;

  const update = {};
  if (result === 'win') update.wins = profile.wins + 1;
  else if (result === 'loss') update.losses = profile.losses + 1;
  else update.draws = profile.draws + 1;

  // total_score: 누적 점수 (해당 논쟁에서 받은 최종 점수 합산)
  update.total_score = profile.total_score + score;

  await supabaseAdmin
    .from('profiles')
    .update(update)
    .eq('id', userId);
}

function avg(arr) {
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}
