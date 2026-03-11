import { supabaseAdmin } from '../config/supabase.js';
import { runParallelJudgment } from './ai/judgment.service.js';
import { calculateCompositeVerdict } from './verdict.service.js';

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

  // 4. 3-model 병렬 판결
  let judgments;
  try {
    judgments = await runParallelJudgment({
      topic: debate.topic,
      purpose: debate.purpose,
      lens: debate.lens,
      argumentA: sideA.content,
      argumentB: sideB.content,
    });
  } catch (aiErr) {
    // AI 전체 실패 시 status 롤백
    console.error(`[triggerJudgment] AI 판결 실패, 롤백: ${aiErr.message}`);
    await supabaseAdmin
      .from('debates')
      .update({ status: 'arguing' })
      .eq('id', debateId);
    throw aiErr;
  }

  // 5. 복합 판결 저장
  await calculateCompositeVerdict(debateId, judgments);

  // 6. voting 상태 + 투표 마감시간 설정
  const voteDurationHours = parseInt(process.env.VOTE_DURATION_HOURS || '24', 10);
  const voteDeadline = new Date(Date.now() + voteDurationHours * 60 * 60 * 1000);

  await supabaseAdmin
    .from('debates')
    .update({ status: 'voting', vote_deadline: voteDeadline.toISOString() })
    .eq('id', debateId);

  console.log(`[triggerJudgment] 판결 완료 → voting (debate: ${debateId})`);
}
