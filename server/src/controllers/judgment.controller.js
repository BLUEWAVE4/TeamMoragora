import { supabaseAdmin } from '../config/supabase.js';
import { runParallelJudgment } from '../services/ai/judgment.service.js';
import { calculateCompositeVerdict } from '../services/verdict.service.js';

export async function requestJudgment(req, res, next) {
  try {
    const { debateId } = req.params;

    // Fetch debate + arguments
    const { data: debate } = await supabaseAdmin
      .from('debates')
      .select('*')
      .eq('id', debateId)
      .single();

    if (!debate) {
      return res.status(404).json({ error: '논쟁을 찾을 수 없습니다.' });
    }

    // 상태 검증: arguing 상태에서만 판결 요청 가능
    if (debate.status !== 'arguing') {
      return res.status(400).json({
        error: `현재 상태(${debate.status})에서는 판결을 요청할 수 없습니다.`,
      });
    }

    // 중복 판결 방지: 이미 verdict가 존재하면 거부
    const { data: existingVerdict } = await supabaseAdmin
      .from('verdicts')
      .select('id')
      .eq('debate_id', debateId)
      .maybeSingle();

    if (existingVerdict) {
      return res.status(409).json({ error: '이미 판결이 존재합니다.' });
    }

    const { data: args } = await supabaseAdmin
      .from('arguments')
      .select('*')
      .eq('debate_id', debateId);

    const sideA = args.find((a) => a.side === 'A');
    const sideB = args.find((a) => a.side === 'B');

    if (!sideA || !sideB) {
      return res.status(400).json({ error: '양측 주장이 모두 필요합니다.' });
    }

    // Update status to judging (원자적 상태 전환으로 동시 요청 방지)
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('debates')
      .update({ status: 'judging' })
      .eq('id', debateId)
      .eq('status', 'arguing')
      .select('id')
      .single();

    if (updateErr || !updated) {
      return res.status(409).json({ error: '다른 판결 요청이 이미 진행 중입니다.' });
    }

    let judgments;
    try {
      // 3-model parallel judgment
      judgments = await runParallelJudgment({
        topic: debate.topic,
        purpose: debate.purpose,
        lens: debate.lens,
        argumentA: sideA.content,
        argumentB: sideB.content,
      });
    } catch (aiErr) {
      // AI 전체 실패 시 status를 arguing으로 롤백
      console.error(`[AI] 판결 실패, status 롤백: ${aiErr.message}`);
      await supabaseAdmin
        .from('debates')
        .update({ status: 'arguing' })
        .eq('id', debateId);
      throw aiErr;
    }

    // Save individual AI judgments + composite verdict (AI only)
    const verdict = await calculateCompositeVerdict(debateId, judgments);

    // Update status to voting + set vote deadline
    const voteDurationHours = parseInt(process.env.VOTE_DURATION_HOURS || '24', 10);
    const voteDeadline = new Date(Date.now() + voteDurationHours * 60 * 60 * 1000);

    await supabaseAdmin
      .from('debates')
      .update({ status: 'voting', vote_deadline: voteDeadline.toISOString() })
      .eq('id', debateId);

    res.json({ ...verdict, vote_deadline: voteDeadline });
  } catch (err) {
    next(err);
  }
}

export async function getVerdict(req, res, next) {
  try {
    const { data: verdict, error } = await supabaseAdmin
      .from('verdicts')
      .select('*, ai_judgments(*)')
      .eq('debate_id', req.params.debateId)
      .single();

    if (error) throw error;
    res.json(verdict);
  } catch (err) {
    next(err);
  }
}

export async function getVerdictFeed(_req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('verdicts')
      .select('*, debate:debates!debate_id(topic, category, status, creator:profiles!creator_id(nickname))')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}
