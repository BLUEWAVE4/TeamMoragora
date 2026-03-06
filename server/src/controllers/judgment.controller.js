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

    const { data: args } = await supabaseAdmin
      .from('arguments')
      .select('*')
      .eq('debate_id', debateId);

    const sideA = args.find((a) => a.side === 'A');
    const sideB = args.find((a) => a.side === 'B');

    if (!sideA || !sideB) {
      return res.status(400).json({ error: '양측 주장이 모두 필요합니다.' });
    }

    // Update status to judging
    await supabaseAdmin
      .from('debates')
      .update({ status: 'judging' })
      .eq('id', debateId);

    // 3-model parallel judgment
    const judgments = await runParallelJudgment({
      topic: debate.topic,
      purpose: debate.purpose,
      lens: debate.lens,
      argumentA: sideA.content,
      argumentB: sideB.content,
    });

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
      .select('*, debate:debates!debate_id(topic, category, creator:profiles!creator_id(nickname))')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}
