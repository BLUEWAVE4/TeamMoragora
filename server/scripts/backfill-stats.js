/**
 * 일회성 스크립트: 기존 verdict 데이터를 기반으로 profiles 전적/XP 소급 반영
 * 실행: node server/scripts/backfill-stats.js
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getTierByScore(totalScore) {
  const thresholds = [
    { min: 5001, tier: '대법관' },
    { min: 2001, tier: '판사' },
    { min: 1001, tier: '변호사' },
    { min: 300, tier: '배심원' },
    { min: 0, tier: '시민' },
  ];
  for (const t of thresholds) {
    if (totalScore >= t.min) return t.tier;
  }
  return '시민';
}

async function main() {
  // 1. 모든 프로필 전적 초기화
  console.log('프로필 전적 초기화...');
  await supabase
    .from('profiles')
    .update({ wins: 0, losses: 0, draws: 0, total_score: 0, tier: '시민' })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // 전체 업데이트

  // 2. 모든 verdict + debate 조회
  const { data: verdicts, error } = await supabase
    .from('verdicts')
    .select('debate_id, winner_side, final_score_a, final_score_b');

  if (error) { console.error('verdict 조회 실패:', error); return; }
  console.log(`verdict ${verdicts.length}건 처리 시작`);

  let applied = 0;
  let skipped = 0;

  for (const v of verdicts) {
    const { data: debate } = await supabase
      .from('debates')
      .select('creator_id, opponent_id')
      .eq('id', v.debate_id)
      .single();

    if (!debate || !debate.opponent_id) {
      skipped++;
      continue;
    }

    // debate 상태를 completed로 전환
    await supabase
      .from('debates')
      .update({ status: 'completed' })
      .eq('id', v.debate_id);

    const creatorResult = v.winner_side === 'A' ? 'win'
      : v.winner_side === 'B' ? 'loss' : 'draw';
    const opponentResult = v.winner_side === 'B' ? 'win'
      : v.winner_side === 'A' ? 'loss' : 'draw';

    // creator (A측) 프로필 업데이트
    await applyResult(debate.creator_id, creatorResult, v.final_score_a);
    // opponent (B측) 프로필 업데이트
    await applyResult(debate.opponent_id, opponentResult, v.final_score_b);

    applied++;
    console.log(`  [${applied}] debate ${v.debate_id} → ${v.winner_side} (A:${v.final_score_a} B:${v.final_score_b})`);
  }

  console.log(`\n완료: ${applied}건 반영, ${skipped}건 스킵 (opponent 없음)`);

  // 최종 프로필 확인
  const { data: profiles } = await supabase
    .from('profiles')
    .select('nickname, wins, losses, draws, total_score, tier')
    .order('total_score', { ascending: false })
    .limit(20);

  console.log('\n=== 업데이트된 랭킹 ===');
  profiles.forEach((p, i) => {
    console.log(`${i + 1}. ${p.nickname} — ${p.total_score}XP (${p.wins}W/${p.losses}L/${p.draws}D) [${p.tier}]`);
  });
}

async function applyResult(userId, result, score) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('wins, losses, draws, total_score')
    .eq('id', userId)
    .single();

  if (!profile) return;

  const update = {};
  if (result === 'win') update.wins = profile.wins + 1;
  else if (result === 'loss') update.losses = profile.losses + 1;
  else update.draws = profile.draws + 1;

  update.total_score = profile.total_score + score;
  update.tier = getTierByScore(update.total_score);

  await supabase.from('profiles').update(update).eq('id', userId);
}

main().catch(console.error);
