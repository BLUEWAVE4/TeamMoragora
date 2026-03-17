import { supabaseAdmin } from '../config/supabase.js';
import { runParallelJudgment } from '../services/ai/judgment.service.js';
import { NotFoundError, ValidationError, ConflictError } from '../errors/index.js';
import { env } from '../config/env.js';

export async function requestJudgment(req, res, next) {
  try {
    const { debateId } = req.params;

    // Fetch debate + arguments
    const { data: debate } = await supabaseAdmin
      .from('debates')
      .select('*')
      .eq('id', debateId)
      .single();

    if (!debate) throw new NotFoundError('논쟁을 찾을 수 없습니다.');

    if (debate.status !== 'arguing') {
      throw new ValidationError(`현재 상태(${debate.status})에서는 판결을 요청할 수 없습니다.`);
    }

    // 중복 판결 방지
    const { data: existingVerdict } = await supabaseAdmin
      .from('verdicts')
      .select('id')
      .eq('debate_id', debateId)
      .maybeSingle();

    if (existingVerdict) throw new ConflictError('이미 판결이 존재합니다.');

    const { data: args } = await supabaseAdmin
      .from('arguments')
      .select('*')
      .eq('debate_id', debateId);

    const sideA = args.find((a) => a.side === 'A');
    const sideB = args.find((a) => a.side === 'B');

    if (!sideA || !sideB) throw new ValidationError('양측 주장이 모두 필요합니다.');

    // Update status to judging (원자적 상태 전환으로 동시 요청 방지)
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('debates')
      .update({ status: 'judging' })
      .eq('id', debateId)
      .eq('status', 'arguing')
      .select('id')
      .single();

    if (updateErr || !updated) throw new ConflictError('다른 판결 요청이 이미 진행 중입니다.');

    // 빈 verdict 먼저 생성 (프론트가 ai_judgments를 즉시 폴링 가능)
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
      })
      .select('id')
      .single();

    if (vErr) throw vErr;
    const verdictId = emptyVerdict.id;

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
      console.error(`[AI] 판결 실패, status 롤백: ${aiErr.message}`);
      await supabaseAdmin.from('ai_judgments').delete().eq('verdict_id', verdictId);
      await supabaseAdmin.from('verdicts').delete().eq('id', verdictId);
      await supabaseAdmin
        .from('debates')
        .update({ status: 'arguing' })
        .eq('id', debateId);
      throw aiErr;
    }

    // 복합 판결 업데이트
    const avg = (arr) => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
    const aiScoreA = avg(judgments.map((j) => j.score_a));
    const aiScoreB = avg(judgments.map((j) => j.score_b));
    // 다수결 + 점수 기반 보정
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

    await supabaseAdmin
      .from('verdicts')
      .update({
        winner_side: aiWinner,
        summary: judgments[0]?.verdict_text || '',
        ai_score_a: aiScoreA,
        ai_score_b: aiScoreB,
        final_score_a: aiScoreA,
        final_score_b: aiScoreB,
      })
      .eq('id', verdictId);

    const verdict = { id: verdictId, debate_id: debateId, winner_side: aiWinner, ai_score_a: aiScoreA, ai_score_b: aiScoreB };

    // Update status to voting + set vote deadline (debate.vote_duration 일 단위, 없으면 기본값)
    const durationMs = debate.vote_duration
      ? debate.vote_duration * 24 * 60 * 60 * 1000
      : env.VOTE_DURATION_HOURS * 60 * 60 * 1000;
    const voteDeadline = new Date(Date.now() + durationMs);

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
      .select('*, ai_judgments(*), debate:debates!debate_id(topic, category, lens, purpose, pro_side, con_side, status, vote_deadline)')
      .eq('debate_id', req.params.debateId)
      .maybeSingle();

    if (error) throw error;
    if (!verdict) {
      throw new NotFoundError('아직 판결이 완료되지 않았습니다.');
    }

    // 양측 주장도 함께 반환 (라운드별 구분)
    const { data: args } = await supabaseAdmin
      .from('arguments')
      .select('side, content, round, user_id, user:profiles!user_id(nickname)')
      .eq('debate_id', req.params.debateId)
      .order('round', { ascending: true });

    const r1A = args?.find(a => a.side === 'A' && (a.round || 1) === 1);
    const r1B = args?.find(a => a.side === 'B' && (a.round || 1) === 1);
    const r2A = args?.find(a => a.side === 'A' && a.round === 2);
    const r2B = args?.find(a => a.side === 'B' && a.round === 2);

    verdict.arguments = {
      A: r1A?.content || null,
      B: r1B?.content || null,
      nicknameA: r1A?.user?.nickname || null,
      nicknameB: r1B?.user?.nickname || null,
      userIdA: r1A?.user_id || null,
      userIdB: r1B?.user_id || null,
      // 2라운드 반박
      rebuttalA: r2A?.content || null,
      rebuttalB: r2B?.content || null,
    };

    // 실시간 시민 투표 수 조회 (finalizeVerdict 전에도 표시되도록)
    const { data: votes } = await supabaseAdmin
      .from('votes')
      .select('voted_side')
      .eq('debate_id', req.params.debateId);

    if (votes && votes.length > 0) {
      const voteCountA = votes.filter(v => v.voted_side === 'A').length;
      const voteCountB = votes.filter(v => v.voted_side === 'B').length;
      // citizen_score가 아직 계산 안 됐으면 실시간 값으로 채움
      if (!verdict.citizen_vote_count || verdict.citizen_vote_count === 0) {
        verdict.citizen_score_a = voteCountA;
        verdict.citizen_score_b = voteCountB;
        verdict.citizen_vote_count = votes.length;
      }
    }

    res.json(verdict);
  } catch (err) {
    next(err);
  }
}

// ===== OG 메타 태그용 경량 판결 데이터 =====
export async function getVerdictOG(req, res, next) {
  try {
    const { data: verdict, error } = await supabaseAdmin
      .from('verdicts')
      .select('winner_side, ai_score_a, ai_score_b, debate:debates!debate_id(topic, pro_side, con_side)')
      .eq('debate_id', req.params.debateId)
      .maybeSingle();

    if (error) throw error;
    if (!verdict) return res.status(404).json({ error: 'not found' });

    const debate = verdict.debate;
    const winner = verdict.winner_side === 'A' ? (debate.pro_side || 'A측') : (debate.con_side || 'B측');
    const description = `${debate.pro_side || 'A측'} ${verdict.ai_score_a}점 vs ${debate.con_side || 'B측'} ${verdict.ai_score_b}점 — AI 판결: ${winner} 승리!`;

    res.json({
      title: `⚖️ ${debate.topic}`,
      description,
      image: 'https://team-moragora-client.vercel.app/ogCard2.png',
    });
  } catch (err) {
    next(err);
  }
}

// ===== 오늘의 논쟁 (mode='daily') 전용 피드 =====
export async function getDailyVerdicts(req, res, next) {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 5));

    // daily 모드만 가져오기 위해 넉넉하게 조회 후 필터
    const { data, error } = await supabaseAdmin
      .from('verdicts')
      .select('*, debate:debates!debate_id(topic, category, status, creator_id, opponent_id, pro_side, con_side, mode, vote_deadline, creator:profiles!creator_id(nickname))')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const dailyItems = (data || []).filter(v => v.debate?.mode === 'daily').slice(0, limit);

    res.json(dailyItems);
  } catch (err) {
    next(err);
  }
}

export async function getVerdictFeed(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const category = req.query.category || null; // 카테고리 필터
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 넉넉하게 가져와서 daily 제외 + 카테고리 필터
    const fetchLimit = to + 50;
    const { data: rawData, error } = await supabaseAdmin
      .from('verdicts')
      .select('*, debate:debates!debate_id(topic, category, status, creator_id, opponent_id, mode, vote_deadline, pro_side, con_side, purpose, lens, view_count, creator:profiles!creator_id(nickname))')
      .order('created_at', { ascending: false })
      .range(0, fetchLimit);

    if (error) throw error;

    // daily 모드 제외 + 카테고리 필터
    let filtered = (rawData || []).filter(v => v.debate?.mode !== 'daily');
    if (category) {
      filtered = filtered.filter(v => v.debate?.category === category);
    }
    const data = filtered.slice(from, to + 1);
    const count = filtered.length;

    res.json({
      data,
      page,
      limit,
      total: count,
      hasNext: to < count - 1,
    });
  } catch (err) {
    next(err);
  }
}
