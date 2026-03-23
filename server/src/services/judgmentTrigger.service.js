import { supabaseAdmin } from '../config/supabase.js';
import { runParallelJudgment } from './ai/judgment.service.js';
import { env } from '../config/env.js';
import { createNotifications } from './notification.service.js';
import { buildChatUserPrompt } from './ai/prompts.js';

// ===== XP 적용 (판결 결과 반영) =====
async function applyResult(debateId, verdictId) {
  // 간단한 XP 적용 — 승자/패자/무승부 기록
  const { data: debate } = await supabaseAdmin
    .from('debates')
    .select('creator_id, opponent_id')
    .eq('id', debateId)
    .single();

  if (!debate) return;

  const { data: verdict } = await supabaseAdmin
    .from('verdicts')
    .select('winner_side')
    .eq('id', verdictId)
    .single();

  if (!verdict) return;

  const winnerId = verdict.winner_side === 'A' ? debate.creator_id
    : verdict.winner_side === 'B' ? debate.opponent_id : null;
  const loserId = verdict.winner_side === 'A' ? debate.opponent_id
    : verdict.winner_side === 'B' ? debate.creator_id : null;

  if (verdict.winner_side === 'draw') {
    // 무승부: 양측 draws +1
    for (const uid of [debate.creator_id, debate.opponent_id].filter(Boolean)) {
      const { data: p } = await supabaseAdmin.from('profiles').select('draws').eq('id', uid).single();
      if (p) await supabaseAdmin.from('profiles').update({ draws: (p.draws || 0) + 1 }).eq('id', uid);
    }
  } else if (winnerId && loserId) {
    // 승자 wins +1
    const { data: wp } = await supabaseAdmin.from('profiles').select('wins').eq('id', winnerId).single();
    if (wp) await supabaseAdmin.from('profiles').update({ wins: (wp.wins || 0) + 1 }).eq('id', winnerId);
    // 패자 losses +1
    const { data: lp } = await supabaseAdmin.from('profiles').select('losses').eq('id', loserId).single();
    if (lp) await supabaseAdmin.from('profiles').update({ losses: (lp.losses || 0) + 1 }).eq('id', loserId);
  }
}

// 양측 주장 제출 완료 시 비동기로 AI 판결 실행
export async function triggerJudgment(debateId) {
  // 1. debate 조회
  const { data: debate } = await supabaseAdmin
    .from('debates')
    .select('*')
    .eq('id', debateId)
    .single();

  if (!debate) throw new Error('논쟁을 찾을 수 없습니다.');

  // ===== 채팅 모드 분기 =====
  if (debate.mode === 'chat') {
    return triggerChatJudgment(debate);
  }

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

  const r1A = args?.find((a) => a.side === 'A' && (a.round || 1) === 1);
  const r1B = args?.find((a) => a.side === 'B' && (a.round || 1) === 1);
  const r2A = args?.find((a) => a.side === 'A' && a.round === 2);
  const r2B = args?.find((a) => a.side === 'B' && a.round === 2);

  if (!r1A || !r1B) return;

  // 2-1. 닉네임 조회
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, nickname')
    .in('id', [debate.creator_id, debate.opponent_id]);

  let nicknameA = profiles?.find(p => p.id === debate.creator_id)?.nickname || '찬성측';
  let nicknameB = profiles?.find(p => p.id === debate.opponent_id)?.nickname || '반대측';

  // daily 모드이거나 같은 유저인 경우 "(찬성)/(반대)" 구분 추가
  if (debate.creator_id === debate.opponent_id || debate.mode === 'daily') {
    nicknameA = `${nicknameA}(찬성)`;
    nicknameB = `${nicknameB.replace(/\(찬성\)$/, '')}(반대)`;
  }

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
        nickname_a: nicknameA,
        nickname_b: nicknameB,
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
      argumentA: r1A.content,
      argumentB: r1B.content,
      rebuttalA: r2A?.content || null,
      rebuttalB: r2B?.content || null,
      nicknameA,
      nicknameB,
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

  // 7. voting 상태 + 투표 마감시간 설정 (debate.vote_duration 일 단위, 없으면 기본값)
  const durationMs = debate.vote_duration
    ? debate.vote_duration * 24 * 60 * 60 * 1000
    : env.VOTE_DURATION_HOURS * 60 * 60 * 1000;
  const voteDeadline = new Date(Date.now() + durationMs);

  await supabaseAdmin
    .from('debates')
    .update({ status: 'voting', vote_deadline: voteDeadline.toISOString() })
    .eq('id', debateId);

  // 8. 양측에 판결 완료 알림
  const participants = [debate.creator_id, debate.opponent_id].filter(Boolean);
  await createNotifications(participants.map(uid => ({
    user_id: uid,
    type: 'verdict_complete',
    title: 'AI 판결이 완료되었습니다',
    message: `"${debate.topic}" 판결 결과를 확인하세요.`,
    link: `/debate/${debateId}/judging`,
  })));

  console.log(`[triggerJudgment] 판결 완료 → voting (debate: ${debateId})`);
}

// ===== 채팅 모드 판결 =====
async function triggerChatJudgment(debate) {
  const debateId = debate.id;

  // 중복 판결 방지
  const { data: existingVerdict } = await supabaseAdmin
    .from('verdicts')
    .select('id')
    .eq('debate_id', debateId)
    .maybeSingle();

  if (existingVerdict) return;

  // 채팅 메시지 조회
  const { data: messages } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('debate_id', debateId)
    .order('created_at', { ascending: true });

  if (!messages || messages.length === 0) {
    console.error(`[triggerChatJudgment] 채팅 메시지 없음 (debate: ${debateId})`);
    await supabaseAdmin
      .from('debates')
      .update({ status: 'chatting' })
      .eq('id', debateId);
    return;
  }

  // 닉네임 조회
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, nickname')
    .in('id', [debate.creator_id, debate.opponent_id].filter(Boolean));

  const nicknameA = profiles?.find(p => p.id === debate.creator_id)?.nickname || '찬성측';
  const nicknameB = profiles?.find(p => p.id === debate.opponent_id)?.nickname || '반대측';

  // 채팅 로그를 AI 프롬프트용 텍스트로 변환
  const chatLog = buildChatUserPrompt({
    topic: debate.topic,
    purpose: debate.purpose,
    lens: debate.lens,
    messages,
    nicknameA,
    nicknameB,
  });

  // A측/B측 메시지를 하나로 합쳐서 argumentA/argumentB로 전달
  const sideAMessages = messages.filter(m => m.side === 'A').map(m => m.content).join('\n');
  const sideBMessages = messages.filter(m => m.side === 'B').map(m => m.content).join('\n');

  // 빈 verdict 생성
  let verdictId;
  try {
    const { data: emptyVerdict, error: vErr } = await supabaseAdmin
      .from('verdicts')
      .insert({
        debate_id: debateId,
        winner_side: 'draw',
        summary: '',
        ai_score_a: 0,
        ai_score_b: 0,
        final_score_a: 0,
        final_score_b: 0,
        is_citizen_applied: false,
        nickname_a: nicknameA,
        nickname_b: nicknameB,
      })
      .select('id')
      .single();

    if (vErr) throw vErr;
    verdictId = emptyVerdict.id;
  } catch (err) {
    console.error(`[triggerChatJudgment] verdict 생성 실패, 롤백: ${err.message}`);
    await supabaseAdmin
      .from('debates')
      .update({ status: 'chatting' })
      .eq('id', debateId);
    throw err;
  }

  // 3-model 병렬 판결 (채팅 로그를 argumentA/B로 전달)
  let judgments;
  try {
    judgments = await runParallelJudgment({
      topic: debate.topic,
      purpose: debate.purpose,
      lens: debate.lens,
      argumentA: sideAMessages || '(메시지 없음)',
      argumentB: sideBMessages || '(메시지 없음)',
      rebuttalA: null,
      rebuttalB: null,
      nicknameA,
      nicknameB,
      // 채팅 모드 전용: 채팅 로그 전체를 추가 컨텍스트로 전달
      chatLog,
    }, verdictId);
  } catch (aiErr) {
    console.error(`[triggerChatJudgment] AI 판결 실패, 롤백: ${aiErr.message}`);
    await supabaseAdmin.from('ai_judgments').delete().eq('verdict_id', verdictId);
    await supabaseAdmin.from('verdicts').delete().eq('id', verdictId);
    await supabaseAdmin
      .from('debates')
      .update({ status: 'chatting' })
      .eq('id', debateId);
    throw aiErr;
  }

  // 복합 판결 업데이트
  await updateCompositeVerdict(verdictId, judgments);

  // 채팅 모드: 시민 투표 없이 바로 completed (vote_deadline이 null)
  if (!debate.vote_duration) {
    // final_score = ai_score 그대로, 바로 completed
    await supabaseAdmin
      .from('debates')
      .update({ status: 'completed' })
      .eq('id', debateId);

    // 결과 적용 (승패 기록)
    await applyResult(debateId, verdictId);

    console.log(`[triggerChatJudgment] 채팅 판결 완료 → completed (debate: ${debateId})`);
  } else {
    // vote_duration이 있으면 투표 단계로 이동
    const durationMs = debate.vote_duration * 24 * 60 * 60 * 1000;
    const voteDeadline = new Date(Date.now() + durationMs);

    await supabaseAdmin
      .from('debates')
      .update({ status: 'voting', vote_deadline: voteDeadline.toISOString() })
      .eq('id', debateId);

    console.log(`[triggerChatJudgment] 채팅 판결 완료 → voting (debate: ${debateId})`);
  }

  // 양측에 판결 완료 알림
  const participants = [debate.creator_id, debate.opponent_id].filter(Boolean);
  await createNotifications(participants.map(uid => ({
    user_id: uid,
    type: 'verdict_complete',
    title: 'AI 판결이 완료되었습니다',
    message: `"${debate.topic}" 채팅 판결 결과를 확인하세요.`,
    link: `/debate/${debateId}/judging`,
  })));
}

// verdict를 최종 점수로 업데이트 (ai_judgments는 이미 개별 저장됨)
async function updateCompositeVerdict(verdictId, judgments) {
  const avg = (arr) => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);

  const aiScoreA = avg(judgments.map((j) => j.score_a));
  const aiScoreB = avg(judgments.map((j) => j.score_b));

  // 다수결 + 점수 기반 보정
  const winnerVotes = { A: 0, B: 0, draw: 0 };
  judgments.forEach((j) => {
    // AI가 winner_side를 잘못 반환한 경우 점수 기반으로 보정
    const corrected = j.score_a > j.score_b ? 'A'
      : j.score_b > j.score_a ? 'B' : 'draw';
    winnerVotes[corrected]++;
  });
  // 다수결로 결정, 동률이면 평균 점수로 결정
  let aiWinner;
  if (winnerVotes.A > winnerVotes.B) aiWinner = 'A';
  else if (winnerVotes.B > winnerVotes.A) aiWinner = 'B';
  else aiWinner = aiScoreA > aiScoreB ? 'A' : aiScoreB > aiScoreA ? 'B' : 'draw';

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
