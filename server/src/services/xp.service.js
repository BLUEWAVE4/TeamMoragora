import { supabaseAdmin } from '../config/supabase.js';

// XP 보상 테이블 (문서 기준: 06-new-systems-spec)
const XP_REWARDS = {
  victory: 30,
  defeat: 5,
  draw: 15,
  daily_debate: 10,
};

// 티어 승급 기준 (total_score 기반, 프론트 ProfilePage/RankingPage와 동일)
const TIER_THRESHOLDS = [
  { min: 5001, tier: '대법관' },
  { min: 2001, tier: '판사' },
  { min: 1001, tier: '변호사' },
  { min: 300,  tier: '배심원' },
  { min: 0,    tier: '시민' },
];

// total_score 기반 티어 계산
export function getTierByScore(totalScore) {
  for (const t of TIER_THRESHOLDS) {
    if (totalScore >= t.min) return t.tier;
  }
  return '시민';
}

// 활동 로그 기록 (xp_logs에만 기록, profiles.xp는 사용하지 않음)
export async function grantXP(userId, reason, referenceId = null) {
  const amount = XP_REWARDS[reason];
  if (!amount) return null;

  await supabaseAdmin.from('xp_logs').insert({
    user_id: userId,
    xp_amount: amount,
    reason,
    reference_id: referenceId,
  });

  return { userId, xpGained: amount, reason };
}

// 논쟁 결과에 따른 활동 로그 일괄 기록 (양측 모두)
export async function grantDebateXP(debateId, creatorId, opponentId, finalWinner) {
  const creatorResult = finalWinner === 'A' ? 'victory'
    : finalWinner === 'B' ? 'defeat' : 'draw';
  const opponentResult = finalWinner === 'B' ? 'victory'
    : finalWinner === 'A' ? 'defeat' : 'draw';

  const results = await Promise.all([
    grantXP(creatorId, creatorResult, debateId),
    grantXP(opponentId, opponentResult, debateId),
  ]);

  return results;
}

// 시민투표 마감 후 적중/미적중 정산 로그 (적중 +3, 미적중 -3)
export async function settleVoteXP(debateId, finalWinner) {
  if (finalWinner === 'draw') return [];

  const { data: allVotes } = await supabaseAdmin
    .from('votes')
    .select('user_id, voted_side')
    .eq('debate_id', debateId);

  if (!allVotes || allVotes.length === 0) return [];

  const results = await Promise.all(
    allVotes.map((v) => {
      const isCorrect = v.voted_side === finalWinner;
      return logVoteResult(v.user_id, isCorrect ? 3 : -3, isCorrect ? 'bonus' : 'penalty', debateId);
    })
  );

  return results;
}

// 투표 정산 로그 기록
async function logVoteResult(userId, amount, reason, referenceId) {
  await supabaseAdmin.from('xp_logs').insert({
    user_id: userId,
    xp_amount: amount,
    reason,
    reference_id: referenceId,
  });

  return { userId, xpChange: amount, reason };
}
