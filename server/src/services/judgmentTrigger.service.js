import { supabaseAdmin } from '../config/supabase.js';
import { runParallelJudgment } from './ai/judgment.service.js';
import { env } from '../config/env.js';
import { createNotifications } from './notification.service.js';
import { buildChatUserPrompt } from './ai/prompts.js';

// ===== XP 적용 (판결 결과 반영) =====
async function applyResult(debateId, verdictId) {
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
    const uids = [debate.creator_id, debate.opponent_id].filter(Boolean);
    const profiles = await Promise.all(uids.map(uid => supabaseAdmin.from('profiles').select('draws').eq('id', uid).single()));
    await Promise.all(profiles.map(({ data: p }, i) =>
      p ? supabaseAdmin.from('profiles').update({ draws: (p.draws || 0) + 1 }).eq('id', uids[i]) : null
    ));
  } else if (winnerId && loserId) {
    const [{ data: wp }, { data: lp }] = await Promise.all([
      supabaseAdmin.from('profiles').select('wins').eq('id', winnerId).single(),
      supabaseAdmin.from('profiles').select('losses').eq('id', loserId).single(),
    ]);
    await Promise.all([
      wp ? supabaseAdmin.from('profiles').update({ wins: (wp.wins || 0) + 1 }).eq('id', winnerId) : null,
      lp ? supabaseAdmin.from('profiles').update({ losses: (lp.losses || 0) + 1 }).eq('id', loserId) : null,
    ]);
  }
}

// ===== 일반 모드 판결 트리거 =====
export async function triggerJudgment(debateId) {
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

  if (debate.status !== 'arguing') return;

  const { data: existingVerdict } = await supabaseAdmin
    .from('verdicts')
    .select('id')
    .eq('debate_id', debateId)
    .maybeSingle();

  if (existingVerdict) return;

  const { data: args } = await supabaseAdmin
    .from('arguments')
    .select('*')
    .eq('debate_id', debateId);

  const r1A = args?.find((a) => a.side === 'A' && (a.round || 1) === 1);
  const r1B = args?.find((a) => a.side === 'B' && (a.round || 1) === 1);
  const r2A = args?.find((a) => a.side === 'A' && a.round === 2);
  const r2B = args?.find((a) => a.side === 'B' && a.round === 2);

  if (!r1A || !r1B) return;

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, nickname')
    .in('id', [debate.creator_id, debate.opponent_id]);

  let nicknameA = profiles?.find(p => p.id === debate.creator_id)?.nickname || '찬성측';
  let nicknameB = debate.mode === 'solo'
    ? '소크라테스'
    : (profiles?.find(p => p.id === debate.opponent_id)?.nickname || '반대측');

  if (debate.creator_id === debate.opponent_id && debate.mode !== 'solo' || debate.mode === 'daily') {
    nicknameA = `${nicknameA}(찬성)`;
    nicknameB = `${nicknameB.replace(/\(찬성\)$/, '')}(반대)`;
  }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('debates')
    .update({ status: 'judging' })
    .eq('id', debateId)
    .eq('status', 'arguing')
    .select('id')
    .single();

  if (updateErr || !updated) return;

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
    console.error(`[triggerJudgment] verdict 생성 실패, 롤백: ${err.message}`);
    await supabaseAdmin
      .from('debates')
      .update({ status: 'arguing' })
      .eq('id', debateId);
    throw err;
  }

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
    console.error(`[triggerJudgment] AI 판결 실패, 롤백: ${aiErr.message}`);
    await supabaseAdmin.from('ai_judgments').delete().eq('verdict_id', verdictId);
    await supabaseAdmin.from('verdicts').delete().eq('id', verdictId);
    await supabaseAdmin
      .from('debates')
      .update({ status: 'arguing' })
      .eq('id', debateId);
    throw aiErr;
  }

  await updateCompositeVerdict(verdictId, judgments);

  // ✅ 버그 수정: voteDeadline 스코프 문제 해결
  if (debate.vote_duration) {
    const durationMs = debate.vote_duration * 24 * 60 * 60 * 1000;
    const voteDeadline = new Date(Date.now() + durationMs);
    await supabaseAdmin
      .from('debates')
      .update({ status: 'voting', vote_deadline: voteDeadline.toISOString() })
      .eq('id', debateId);
  } else {
    await supabaseAdmin
      .from('debates')
      .update({ status: 'completed' })
      .eq('id', debateId);
    await applyResult(debateId, verdictId);
  }

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

  const { data: existingVerdict } = await supabaseAdmin
    .from('verdicts')
    .select('id')
    .eq('debate_id', debateId)
    .maybeSingle();

  if (existingVerdict) return;

  const { data: messages } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('debate_id', debateId)
    .order('created_at', { ascending: true });

  if (!messages || messages.length === 0) {
    console.warn(`[triggerChatJudgment] 채팅 메시지 없음 → 무승부 처리 (debate: ${debateId})`);
    // 메시지 없으면 무승부로 즉시 완료 처리 (스킵 후 메시지 없는 경우)
    const { data: emptyVerdict } = await supabaseAdmin
      .from('verdicts')
      .insert({
        debate_id: debateId,
        winner_side: 'draw',
        summary: '양측 주장이 제출되지 않아 무승부로 처리되었습니다.',
        ai_score_a: 0, ai_score_b: 0,
        final_score_a: 0, final_score_b: 0,
        is_citizen_applied: false,
      })
      .select('id')
      .maybeSingle();

    await supabaseAdmin
      .from('debates')
      .update({ status: 'completed' })
      .eq('id', debateId);

    if (emptyVerdict) await applyResult(debateId, emptyVerdict.id);
    return;
  }

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, nickname')
    .in('id', [debate.creator_id, debate.opponent_id].filter(Boolean));

  const nicknameA = profiles?.find(p => p.id === debate.creator_id)?.nickname || '찬성측';
  const nicknameB = profiles?.find(p => p.id === debate.opponent_id)?.nickname || '반대측';

  const chatLog = buildChatUserPrompt({
    topic: debate.topic,
    purpose: debate.purpose,
    lens: debate.lens,
    messages,
    nicknameA,
    nicknameB,
  });

  const sideAMessages = messages.filter(m => m.side === 'A').map(m => m.content).join('\n');
  const sideBMessages = messages.filter(m => m.side === 'B').map(m => m.content).join('\n');

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

  await updateCompositeVerdict(verdictId, judgments);

  if (!debate.vote_duration) {
    await supabaseAdmin
      .from('debates')
      .update({ status: 'completed' })
      .eq('id', debateId);

    await applyResult(debateId, verdictId);
    console.log(`[triggerChatJudgment] 채팅 판결 완료 → completed (debate: ${debateId})`);
  } else {
    const durationMs = debate.vote_duration * 24 * 60 * 60 * 1000;
    const voteDeadline = new Date(Date.now() + durationMs);
    await supabaseAdmin
      .from('debates')
      .update({ status: 'voting', vote_deadline: voteDeadline.toISOString() })
      .eq('id', debateId);
    console.log(`[triggerChatJudgment] 채팅 판결 완료 → voting (debate: ${debateId})`);
  }

  const participants = [debate.creator_id, debate.opponent_id].filter(Boolean);
  await createNotifications(participants.map(uid => ({
    user_id: uid,
    type: 'verdict_complete',
    title: 'AI 판결이 완료되었습니다',
    message: `"${debate.topic}" 채팅 판결 결과를 확인하세요.`,
    link: `/debate/${debateId}/judging`,
  })));
}

// ===== 복합 판결 업데이트 =====
async function updateCompositeVerdict(verdictId, judgments) {
  const avg = (arr) => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);

  const aiScoreA = avg(judgments.map((j) => j.score_a));
  const aiScoreB = avg(judgments.map((j) => j.score_b));

  const winnerVotes = { A: 0, B: 0, draw: 0 };
  judgments.forEach((j) => {
    const corrected = j.score_a > j.score_b ? 'A'
      : j.score_b > j.score_a ? 'B' : 'draw';
    winnerVotes[corrected]++;
  });

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