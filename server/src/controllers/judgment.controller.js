import { supabaseAdmin } from '../config/supabase.js';
import { runParallelJudgment, retrySingleJudgment } from '../services/ai/judgment.service.js';
import { NotFoundError, ValidationError, ConflictError } from '../errors/index.js';
import { env } from '../config/env.js';
import { VERDICT_FETCH_LIMIT } from '../config/constants.js';

export async function requestJudgment(req, res, next) {
  try {
    const { debateId } = req.params;

    // Fetch debate + arguments
    const { data: debate } = await supabaseAdmin
      .from('debates')
      .select('id, creator_id, opponent_id, topic, description, pro_side, con_side, category, purpose, lens, mode, status, invite_code, vote_duration')
      .eq('id', debateId)
      .single();

    if (!debate) throw new NotFoundError('논쟁을 찾을 수 없습니다.');

    if (debate.status !== 'arguing') {
      throw new ValidationError('현재 상태에서는 판결을 요청할 수 없습니다.');
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
      .select('id, debate_id, user_id, side, round, content, created_at')
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
      .select('*, ai_judgments(*), debate:debates!debate_id(topic, category, lens, purpose, pro_side, con_side, status, vote_deadline, mode, creator_id, opponent_id)')
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

    // chat 모드: arguments 테이블 대신 debate의 creator_id/opponent_id 사용
    const isChat = verdict.debate?.mode === 'chat';

    verdict.arguments = {
      A: r1A?.content || null,
      B: r1B?.content || null,
      nicknameA: r1A?.user?.nickname || verdict.nickname_a || null,
      nicknameB: verdict.debate?.mode === 'solo' ? '소크라테스' : (r1B?.user?.nickname || verdict.nickname_b || null),
      userIdA: r1A?.user_id || (isChat ? verdict.debate?.creator_id : null),
      userIdB: r1B?.user_id || (isChat ? verdict.debate?.opponent_id : null),
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

// ===== 단일 AI 모델 재판결 =====
export async function retryJudgment(req, res, next) {
  try {
    const { debateId, model } = req.params;
    const validModels = ['gpt', 'gemini', 'claude'];
    if (!validModels.includes(model)) {
      throw new ValidationError('유효하지 않은 모델입니다. (gpt, gemini, claude)');
    }

    // verdict 조회
    const { data: verdict } = await supabaseAdmin
      .from('verdicts')
      .select('id')
      .eq('debate_id', debateId)
      .maybeSingle();

    if (!verdict) throw new NotFoundError('판결 데이터를 찾을 수 없습니다.');

    // debate + arguments 조회
    const { data: debate } = await supabaseAdmin
      .from('debates')
      .select('topic, purpose, lens, creator_id, opponent_id')
      .eq('id', debateId)
      .single();

    const { data: args } = await supabaseAdmin
      .from('arguments')
      .select('side, content, round, user_id')
      .eq('debate_id', debateId);

    const r1A = args?.find(a => a.side === 'A' && (a.round || 1) === 1);
    const r1B = args?.find(a => a.side === 'B' && (a.round || 1) === 1);
    if (!r1A || !r1B) throw new NotFoundError('주장 데이터를 찾을 수 없습니다.');

    const r2A = args?.find(a => a.side === 'A' && a.round === 2);
    const r2B = args?.find(a => a.side === 'B' && a.round === 2);

    // 닉네임 조회
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, nickname')
      .in('id', [debate.creator_id, debate.opponent_id].filter(Boolean));

    const nicknameA = profiles?.find(p => p.id === debate.creator_id)?.nickname || 'A측';
    const nicknameB = profiles?.find(p => p.id === debate.opponent_id)?.nickname || 'B측';

    const debateContext = {
      topic: debate.topic, purpose: debate.purpose, lens: debate.lens,
      argumentA: r1A.content, argumentB: r1B.content,
      rebuttalA: r2A?.content || null, rebuttalB: r2B?.content || null,
      nicknameA, nicknameB,
    };

    // 단일 모델 재판결 실행
    const result = await retrySingleJudgment(model, debateContext, verdict.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ===== 판결 별점 평가 =====
export async function rateVerdict(req, res, next) {
  try {
    const { debateId } = req.params;
    const { score } = req.body;
    const userId = req.user.id;

    if (!score || score < 0.5 || score > 5 || (score * 2) % 1 !== 0) {
      return res.status(400).json({ error: '0.5~5.0점 사이 점수를 입력해주세요. (0.5 단위)' });
    }

    // verdict 조회
    const { data: verdict } = await supabaseAdmin
      .from('verdicts')
      .select('id')
      .eq('debate_id', debateId)
      .maybeSingle();

    if (!verdict) return res.status(404).json({ error: '판결을 찾을 수 없습니다.' });

    // upsert (이미 평가했으면 업데이트)
    const { error } = await supabaseAdmin
      .from('verdict_ratings')
      .upsert({
        verdict_id: verdict.id,
        user_id: userId,
        score,
      }, { onConflict: 'verdict_id,user_id' });

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ===== 오늘의 논쟁 (mode='daily') 전용 피드 =====
export async function getDailyVerdicts(req, res, next) {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 5));

    // debates 테이블에서 daily 모드 직접 조회 (verdict 유무 관계없이)
    const { data: debates, error: debateErr } = await supabaseAdmin
      .from('debates')
      .select('id, topic, description, category, status, creator_id, opponent_id, pro_side, con_side, mode, vote_deadline, vote_duration, created_at, creator:profiles!creator_id(nickname, tier, gender, avatar_url), opponent:profiles!opponent_id(nickname, tier, gender, avatar_url)')
      .eq('mode', 'daily')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (debateErr) throw debateErr;
    if (!debates || debates.length === 0) return res.json([]);

    // 해당 debate들의 verdict 조회
    const debateIds = debates.map(d => d.id);
    const { data: verdicts } = await supabaseAdmin
      .from('verdicts')
      .select('*')
      .in('debate_id', debateIds);

    const verdictMap = {};
    (verdicts || []).forEach(v => { verdictMap[v.debate_id] = v; });

    // TodayDebate 컴포넌트가 기대하는 구조로 매핑
    const result = debates.map(d => {
      const v = verdictMap[d.id];
      return {
        debate_id: d.id,
        citizen_score_a: v?.citizen_score_a ?? 0,
        citizen_score_b: v?.citizen_score_b ?? 0,
        citizen_vote_count: v?.citizen_vote_count ?? 0,
        created_at: v?.created_at ?? d.created_at,
        ...(v || {}),
        debate: {
          topic: d.topic,
          description: d.description,
          category: d.category,
          status: d.status,
          creator_id: d.creator_id,
          opponent_id: d.opponent_id,
          pro_side: d.pro_side,
          con_side: d.con_side,
          mode: d.mode,
          vote_deadline: d.vote_deadline,
          vote_duration: d.vote_duration,
          created_at: d.created_at,
          creator: d.creator,
        },
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ===== 명예의 전당 — 종합 점수 기반 랭킹 =====
export async function getHallOfFame(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const search = req.query.q || null;

    // verdicts + debate + 좋아요/댓글/조회수
    const { data: rawData, error } = await supabaseAdmin
      .from('verdicts')
      .select('*, debate:debates!debate_id(id, topic, category, status, creator_id, opponent_id, mode, vote_deadline, pro_side, con_side, view_count, creator:profiles!creator_id(nickname, tier, gender, avatar_url), opponent:profiles!opponent_id(nickname, tier, gender, avatar_url))')
      .order('created_at', { ascending: false })
      .limit(VERDICT_FETCH_LIMIT);

    if (error) throw error;

    let items = (rawData || []).filter(v => v.debate?.mode !== 'daily');

    // 검색 필터
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(v => {
        const topic = (v.debate?.topic || '').toLowerCase();
        const creator = (v.debate?.creator?.nickname || '').toLowerCase();
        return topic.includes(q) || creator.includes(q);
      });
    }

    // 좋아요/댓글 수 일괄 조회
    const debateIds = items.map(v => v.debate_id).filter(Boolean);
    let likeMap = {}, commentMap = {};
    if (debateIds.length > 0) {
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabaseAdmin.from('debate_likes').select('debate_id').in('debate_id', debateIds),
        supabaseAdmin.from('comments').select('debate_id').in('debate_id', debateIds),
      ]);
      (likes || []).forEach(r => { likeMap[r.debate_id] = (likeMap[r.debate_id] || 0) + 1; });
      (comments || []).forEach(r => { commentMap[r.debate_id] = (commentMap[r.debate_id] || 0) + 1; });
    }

    // 종합 점수 계산 + 정렬
    // AI 점수 70% + 참여 점수 30%
    const scored = items.map(v => {
      const likes = likeMap[v.debate_id] || 0;
      const commentCount = commentMap[v.debate_id] || 0;
      const voteCount = v.citizen_vote_count || 0;
      const viewCount = v.debate?.view_count || 0;
      const participationScore = likes * 3 + commentCount * 2 + voteCount + viewCount * 0.1;
      const aiScore = (v.ai_score_a || 0) + (v.ai_score_b || 0); // 0~200
      return {
        ...v,
        _likes: likes,
        _comments: commentCount,
        _votes: voteCount,
        _views: viewCount,
        _participationScore: participationScore,
        _aiScore: aiScore,
        _hallScore: aiScore * 0.7 + participationScore * 0.3,
      };
    });

    scored.sort((a, b) => b._hallScore - a._hallScore);

    const from = (page - 1) * limit;
    const pageData = scored.slice(from, from + limit);
    const hasNext = from + limit < scored.length;
    res.json({ data: pageData, page, hasNext });
  } catch (err) {
    next(err);
  }
}

export async function getVerdictFeed(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const category = req.query.category || null;
    const search = req.query.q || null;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // DB 레벨에서 mode 필터 + 카테고리 필터 (inner join)
    let query = supabaseAdmin
      .from('verdicts')
      .select('*, debate:debates!inner(id, topic, category, status, creator_id, opponent_id, mode, vote_deadline, vote_duration, created_at, pro_side, con_side, purpose, lens, view_count, creator:profiles!creator_id(nickname, tier, gender, avatar_url), opponent:profiles!opponent_id(nickname, tier, gender, avatar_url))')
      .not('debate.mode', 'in', '("daily","chat")')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('debate.category', category);
    }

    // 검색이 있으면 넉넉히 가져와서 JS 필터 (topic/nickname 복합 검색)
    if (search) {
      const { data: rawData, error } = await query.range(0, VERDICT_FETCH_LIMIT);
      if (error) throw error;

      const q = search.toLowerCase();
      const filtered = (rawData || []).filter(v => {
        const topic = (v.debate?.topic || '').toLowerCase();
        const creator = (v.debate?.creator?.nickname || '').toLowerCase();
        return topic.includes(q) || creator.includes(q);
      });
      const data = filtered.slice(from, to + 1);
      const count = filtered.length;

      const enriched = await enrichWithCounts(data);
      return res.json({ data: enriched, page, limit, total: count, hasNext: to < count - 1 });
    }

    // 검색 없으면 limit+1 패턴으로 hasNext 판단 (count 쿼리 제거)
    const { data, error } = await query.range(from, to + 1);
    if (error) throw error;

    const rows = data || [];
    const hasNext = rows.length > limit;
    const pageData = hasNext ? rows.slice(0, limit) : rows;

    const enriched = await enrichWithCounts(pageData);
    res.json({ data: enriched, page, limit, hasNext });
  } catch (err) {
    next(err);
  }
}

// 댓글수 + 좋아요수 일괄 조회 헬퍼
async function enrichWithCounts(data) {
  const debateIds = data.map(v => v.debate_id).filter(Boolean);
  if (debateIds.length === 0) return data;

  const [{ data: comments }, { data: likes }] = await Promise.all([
    supabaseAdmin.from('comments').select('debate_id').in('debate_id', debateIds),
    supabaseAdmin.from('debate_likes').select('debate_id').in('debate_id', debateIds),
  ]);

  const commentMap = {}, likeMap = {};
  (comments || []).forEach(c => { commentMap[c.debate_id] = (commentMap[c.debate_id] || 0) + 1; });
  (likes || []).forEach(l => { likeMap[l.debate_id] = (likeMap[l.debate_id] || 0) + 1; });

  return data.map(v => ({
    ...v,
    comments_count: commentMap[v.debate_id] || 0,
    likes_count: likeMap[v.debate_id] || 0,
    views_count: v.debate?.view_count || 0,
  }));
}
