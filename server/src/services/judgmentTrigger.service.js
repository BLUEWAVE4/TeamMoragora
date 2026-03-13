import { supabaseAdmin } from '../config/supabase.js';
import { runParallelJudgment } from './ai/judgment.service.js';
import { env } from '../config/env.js';

// 양측 주장 제출 완료 시 비동기로 AI 판결 실행
export async function triggerJudgment(debateId) {
  // 1. debate 조회
  const { data: debate } = await supabaseAdmin
    .from('debates')
    .select('*')
    .eq('id', debateId)
    .single();

  if (!debate) throw new Error('논쟁을 찾을 수 없습니다.');

  // arguing 상태가 아니면 스킵 (이미 판결 진행 중이거나 완료)
  if (debate.status !== 'arguing') return;

  // 중복 판결 방지
  const { data: existingVerdict } = await supabaseAdmin
    .from('verdicts')
    .select('id')
    .eq('debate_id', debateId)
    .maybeSingle();

  if (existingVerdict) return;

  // 2. 양측 주장 조회
  const { data: args } = await supabaseAdmin
    .from('arguments')
    .select('*')
    .eq('debate_id', debateId);

  const sideA = args?.find((a) => a.side === 'A');
  const sideB = args?.find((a) => a.side === 'B');

  if (!sideA || !sideB) return;

  // 3. 원자적 상태 전환 (arguing → judging)
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('debates')
    .update({ status: 'judging' })
    .eq('id', debateId)
    .eq('status', 'arguing')
    .select('id')
    .single();

  if (updateErr || !updated) return; // 다른 요청이 먼저 처리됨

  // 4. 빈 verdict 먼저 생성 (프론트가 ai_judgments를 즉시 폴링할 수 있도록)
  let verdictId;
  try {
    const { data: emptyVerdict, error: vErr } = await supabaseAdmin
      .from('verdicts')
      .insert({
        debate_id: debateId,
        winner_side: 'draw', // 임시값, 나중에 업데이트
        summary: '',
        ai_score_a: 0,
        ai_score_b: 0,
        final_score_a: 0,
        final_score_b: 0,
        is_citizen_applied: false,
      })
      .select('id')
      .single();

    if (vErr) throw vErr;
    verdictId = emptyVerdict.id;
  } catch (err) {
    console.error(`[triggerJudgment] verdict 생성 실패, 롤백: ${err.message}`);
    await supabaseAdmin
      .from('debates')
      .update({ status: 'arguing' })
      .eq('id', debateId);
    throw err;
  }

  // 5. 3-model 병렬 판결 (각 결과 즉시 ai_judgments에 저장)
  let judgments;
  try {
    judgments = await runParallelJudgment({
      topic: debate.topic,
      purpose: debate.purpose,
      lens: debate.lens,
      argumentA: sideA.content,
      argumentB: sideB.content,
    }, verdictId);
  } catch (aiErr) {
    // AI 전체 실패 시 verdict 삭제 + status 롤백
    console.error(`[triggerJudgment] AI 판결 실패, 롤백: ${aiErr.message}`);
    await supabaseAdmin.from('ai_judgments').delete().eq('verdict_id', verdictId);
    await supabaseAdmin.from('verdicts').delete().eq('id', verdictId);
    await supabaseAdmin
      .from('debates')
      .update({ status: 'arguing' })
      .eq('id', debateId);
    throw aiErr;
  }

  // 6. 복합 판결 업데이트 (빈 verdict를 최종 점수로 갱신)
  await updateCompositeVerdict(verdictId, judgments);

  // 7. voting 상태 + 투표 마감시간 설정 (debate.vote_duration 분 단위, 없으면 기본값)
  const durationMs = debate.vote_duration
    ? debate.vote_duration * 60 * 1000
    : env.VOTE_DURATION_HOURS * 60 * 60 * 1000;
  const voteDeadline = new Date(Date.now() + durationMs);

  await supabaseAdmin
    .from('debates')
    .update({ status: 'voting', vote_deadline: voteDeadline.toISOString() })
    .eq('id', debateId);

  console.log(`[triggerJudgment] 판결 완료 → voting (debate: ${debateId})`);
}

// verdict를 최종 점수로 업데이트 (ai_judgments는 이미 개별 저장됨)
async function updateCompositeVerdict(verdictId, judgments) {
  const avg = (arr) => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);

  const aiScoreA = avg(judgments.map((j) => j.score_a));
  const aiScoreB = avg(judgments.map((j) => j.score_b));

  const winnerVotes = { A: 0, B: 0, draw: 0 };
  judgments.forEach((j) => { winnerVotes[j.winner_side]++; });
  const aiWinner = winnerVotes.A > winnerVotes.B ? 'A'
    : winnerVotes.B > winnerVotes.A ? 'B' : 'draw';

  const summary = judgments[0]?.verdict_text || '';

  await supabaseAdmin
    .from('verdicts')
    .update({
      winner_side: aiWinner,
      summary,
      ai_score_a: aiScoreA,
      ai_score_b: aiScoreB,
      final_score_a: aiScoreA,
      final_score_b: aiScoreB,
    })
    .eq('id', verdictId);
}
