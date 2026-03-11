import { supabaseAdmin } from '../config/supabase.js';

// XP 보상 테이블 (문서 기준: 06-new-systems-spec)
const XP_REWARDS = {
  victory: 30,
  defeat: 5,
  draw: 15,
  daily_debate: 10,
};

// 티어 승급 기준 (누적 XP 기반)
const TIER_THRESHOLDS = [
  { min: 5000, tier: '대법관' },
  { min: 2000, tier: '판사' },
  { min: 1000, tier: '변호사' },
  { min: 300,  tier: '배심원' },
  { min: 0,    tier: '시민' },
];

// XP 기반 티어 계산
export function getTierByXP(xp) {
  for (const t of TIER_THRESHOLDS) {
    if (xp >= t.min) return t.tier;
  }
  return '시민';
}

// XP 지급 + xp_logs 기록 + 티어 업데이트
export async function grantXP(userId, reason, referenceId = null) {
  const amount = XP_REWARDS[reason];
  if (!amount) return null;

  // 1. xp_logs에 기록
  await supabaseAdmin.from('xp_logs').insert({
    user_id: userId,
    xp_amount: amount,
    reason,
    reference_id: referenceId,
  });

  // 2. profiles.xp 누적 + 티어 재계산
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('xp')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  const newXP = profile.xp + amount;
  const newTier = getTierByXP(newXP);

  await supabaseAdmin
    .from('profiles')
    .update({ xp: newXP, tier: newTier })
    .eq('id', userId);

  return { userId, xpGained: amount, totalXP: newXP, tier: newTier, reason };
}

// 논쟁 결과에 따른 XP 일괄 지급 (양측 모두)
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

// 시민투표 마감 후 적중/미적중 정산 (적중 +3, 미적중 -3)
export async function settleVoteXP(debateId, finalWinner) {
  // 무승부면 전원 ±0 (정산 없음)
  if (finalWinner === 'draw') return [];

  // 해당 논쟁의 모든 투표 조회
  const { data: allVotes } = await supabaseAdmin
    .from('votes')
    .select('user_id, voted_side')
    .eq('debate_id', debateId);

  if (!allVotes || allVotes.length === 0) return [];

  const results = await Promise.all(
    allVotes.map((v) => {
      const isCorrect = v.voted_side === finalWinner;
      return applyVoteXP(v.user_id, isCorrect ? 3 : -3, isCorrect ? 'bonus' : 'penalty', debateId);
    })
  );

  return results;
}

// 투표 정산용 XP 적용 (양수/음수 모두 가능)
async function applyVoteXP(userId, amount, reason, referenceId) {
  // 1. xp_logs에 기록
  await supabaseAdmin.from('xp_logs').insert({
    user_id: userId,
    xp_amount: amount,
    reason,
    reference_id: referenceId,
  });

  // 2. profiles.xp 누적 + 티어 재계산 (최소 0)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('xp')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  const newXP = Math.max(0, profile.xp + amount);
  const newTier = getTierByXP(newXP);

  await supabaseAdmin
    .from('profiles')
    .update({ xp: newXP, tier: newTier })
    .eq('id', userId);

  return { userId, xpChange: amount, totalXP: newXP, tier: newTier, reason };
}
