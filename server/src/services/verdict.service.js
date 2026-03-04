import { supabaseAdmin } from '../config/supabase.js';

// 복합 판결 계산: AI 60% + 시민 40% (시민 30명 이상 시)
export async function calculateCompositeVerdict(debateId, judgments) {
  // 1. AI 개별 판결 저장
  const aiScoreA = avg(judgments.map((j) => j.score_a));
  const aiScoreB = avg(judgments.map((j) => j.score_b));

  // 승자 결정 (다수결)
  const winnerVotes = { A: 0, B: 0, draw: 0 };
  judgments.forEach((j) => { winnerVotes[j.winner_side]++; });
  const aiWinner = winnerVotes.A > winnerVotes.B ? 'A'
    : winnerVotes.B > winnerVotes.A ? 'B' : 'draw';

  // 종합 요약 (첫 번째 성공한 AI의 verdict_text 사용)
  const summary = judgments[0]?.verdict_text || '';

  // 2. verdicts 테이블 저장
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

// 시민 투표 반영 (30명 이상 시 호출)
export async function applyCitizenVotes(debateId) {
  const { data: votes } = await supabaseAdmin
    .from('votes')
    .select('voted_side')
    .eq('debate_id', debateId);

  if (!votes || votes.length < 30) return null;

  const countA = votes.filter((v) => v.voted_side === 'A').length;
  const countB = votes.filter((v) => v.voted_side === 'B').length;
  const total = votes.length;

  // 시민 점수: 투표 비율 × 100
  const citizenScoreA = Math.round((countA / total) * 100);
  const citizenScoreB = Math.round((countB / total) * 100);

  // 복합 점수: AI 60% + 시민 40%
  const { data: verdict } = await supabaseAdmin
    .from('verdicts')
    .select('ai_score_a, ai_score_b')
    .eq('debate_id', debateId)
    .single();

  const finalA = Math.round(verdict.ai_score_a * 0.6 + citizenScoreA * 0.4);
  const finalB = Math.round(verdict.ai_score_b * 0.6 + citizenScoreB * 0.4);
  const finalWinner = finalA > finalB ? 'A' : finalB > finalA ? 'B' : 'draw';

  await supabaseAdmin
    .from('verdicts')
    .update({
      citizen_score_a: citizenScoreA,
      citizen_score_b: citizenScoreB,
      final_score_a: finalA,
      final_score_b: finalB,
      winner_side: finalWinner,
      is_citizen_applied: true,
    })
    .eq('debate_id', debateId);

  return { finalA, finalB, finalWinner };
}

function avg(arr) {
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}
