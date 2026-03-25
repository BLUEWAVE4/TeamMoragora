import { supabaseAdmin } from '../config/supabase.js';
import { nanoid } from '../utils/nanoid.js';
import { filterByDictionary } from '../services/contentFilter.service.js';
import { ValidationError } from '../errors/index.js';

export async function createDebate(req, res, next) {
  try {
    const { topic, description, category, purpose, lens, mode, pro_side, con_side, time } = req.body;

    if (!topic?.trim()) throw new ValidationError('주제를 입력해주세요.');

    // 주제/설명 콘텐츠 필터링 (비속어 사전)
    const topicFilter = filterByDictionary(topic);
    if (topicFilter.blocked) throw new ValidationError(`주제: ${topicFilter.reason}`);

    if (description) {
      const descFilter = filterByDictionary(description);
      if (descFilter.blocked) throw new ValidationError(`설명: ${descFilter.reason}`);
    }

    const inviteCode = nanoid(8);
    const debateMode = ['duo', 'solo', 'chat'].includes(mode) ? mode : 'duo';

    const { data, error } = await supabaseAdmin
      .from('debates')
      .insert({
        creator_id: req.user.id,
        topic,
        description: description || null,
        category,
        purpose,
        lens,
        mode: debateMode,
        pro_side: pro_side || null,
        con_side: con_side || null,
        vote_duration: time ? parseInt(time, 10) : null,
        invite_code: inviteCode,
        status: debateMode === 'solo' ? 'arguing' : 'waiting',
      })
      .select()
      .single();
      // console.log("createDebate body:", req.body);
      // console.log("supabase result:", data);
      // console.log("supabase error:", error);

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export async function getDebate(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('debates')
      .select('*, creator:profiles!creator_id(*), opponent:profiles!opponent_id(*)')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: '논쟁을 찾을 수 없습니다.' });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// ===== 내 진행중인 논쟁 목록 (커서 기반 페이지네이션) =====
export async function getMyActiveDebates(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const cursor = req.query.cursor; // created_at ISO string
    const activeStatuses = ['waiting', 'both_joined', 'arguing', 'chatting', 'judging', 'voting'];

    let query = supabaseAdmin
      .from('debates')
      .select('id, topic, status, mode, invite_code, creator_id, opponent_id, created_at, vote_deadline, vote_duration')
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
      .in('status', activeStatuses)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = data || [];
    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    // arguing 상태 논쟁에 주장 수 추가 (판결 대기 판별용)
    const arguingIds = items.filter(d => d.status === 'arguing').map(d => d.id);
    if (arguingIds.length > 0) {
      const { data: argCounts } = await supabaseAdmin
        .from('arguments')
        .select('debate_id')
        .in('debate_id', arguingIds);

      const countMap = {};
      (argCounts || []).forEach(a => {
        countMap[a.debate_id] = (countMap[a.debate_id] || 0) + 1;
      });
      items.forEach(d => {
        if (d.status === 'arguing') d.argument_count = countMap[d.id] || 0;
      });
    }

    res.json({ items, hasMore });
  } catch (err) {
    next(err);
  }
}

export async function listDebates(_req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('debates')
      .select('*, creator:profiles!creator_id(nickname, tier, gender, avatar_url)')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getDebateByInviteCode(req, res, next) {
  try {
    const { inviteCode } = req.params;

    const { data, error } = await supabaseAdmin
      .from('debates')
      .select('*, creator:profiles!creator_id(nickname, avatar_url)')
      .eq('invite_code', inviteCode)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Debate not found' });
    }

    // 이미 상대방이 확정된 논쟁 → 생성자/참여자 외 접근 차단
    // 비로그인 사용자는 일단 통과 (로그인 후 참여 플로우를 위해)
    const userId = req.user?.id;
    if (data.opponent_id && userId && userId !== data.creator_id && userId !== data.opponent_id) {
      return res.status(403).json({ error: '이미 참여자가 확정된 논쟁입니다.' });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

// ===== 조회수 증가 =====
export async function incrementView(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin.rpc('increment_view_count', {
      debate_id_input: req.params.id,
    });
    if (error) {
      // RPC 없으면 직접 update
      const { data: debate } = await supabaseAdmin
        .from('debates')
        .select('view_count')
        .eq('id', req.params.id)
        .single();
      const current = debate?.view_count || 0;
      await supabaseAdmin
        .from('debates')
        .update({ view_count: current + 1 })
        .eq('id', req.params.id);
      return res.json({ view_count: current + 1 });
    }
    res.json({ view_count: data });
  } catch (err) {
    next(err);
  }
}

// ===== 논쟁 삭제 (생성자 또는 참여자) =====
export async function deleteDebate(req, res, next) {
  try {
    const userId = req.user.id;
    const debateId = req.params.id;

    const { data: debate, error: fetchErr } = await supabaseAdmin
      .from('debates')
      .select('id, creator_id, opponent_id, status')
      .eq('id', debateId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!debate) return res.status(404).json({ error: '논쟁을 찾을 수 없습니다.' });

    // 생성자 또는 참여자만 삭제 가능
    if (debate.creator_id !== userId && debate.opponent_id !== userId) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    const { error } = await supabaseAdmin
      .from('debates')
      .delete()
      .eq('id', debateId);

    if (error) throw error;
    res.json({ message: '논쟁이 삭제되었습니다.' });
  } catch (err) {
    next(err);
  }
}

// ===== 대기실 — 전체 chat 모드 논쟁 목록 =====
export async function listChatRooms(_req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('debates')
      .select('id, topic, pro_side, con_side, category, status, creator_id, opponent_id, chat_deadline, created_at, creator:profiles!creator_id(nickname, avatar_url, gender, tier)')
      .eq('mode', 'chat')
      .in('status', ['waiting', 'chatting'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
}

export async function joinByInvite(req, res, next) {
  try {
    const { inviteCode } = req.params;

    // 먼저 invite_code로 논쟁 조회 (상태 무관)
    const { data: existing, error: existErr } = await supabaseAdmin
      .from('debates')
      .select('*')
      .eq('invite_code', inviteCode)
      .single();

    if (existErr || !existing) {
      return res.status(404).json({ error: '유효하지 않은 초대 코드입니다.' });
    }

    // 본인이 만든 논쟁인 경우
    if (existing.creator_id === req.user.id) {
      return res.status(400).json({ error: '자신의 논쟁에 참여할 수 없습니다.' });
    }

    // 이미 참여한 상대방이 다시 접속한 경우 → 논쟁 페이지로 리다이렉트용 데이터 반환
    if (existing.opponent_id === req.user.id) {
      return res.json(existing);
    }

    // 이미 다른 상대방이 참여한 경우
    if (existing.opponent_id) {
      return res.status(409).json({ error: '이미 상대방이 참여한 논쟁입니다.' });
    }

    // 대기 중이 아닌 경우
    if (existing.status !== 'waiting') {
      return res.status(400).json({ error: '이미 진행 중인 논쟁입니다.' });
    }

    const debate = existing;

    // 원자적 업데이트: opponent_id가 아직 null인 경우에만 성공
    const { data, error } = await supabaseAdmin
      .from('debates')
      .update({ opponent_id: req.user.id, status: 'arguing' })
      .eq('id', debate.id)
      .is('opponent_id', null)
      .select()
      .single();

    if (error || !data) {
      return res.status(409).json({ error: '이미 상대방이 참여한 논쟁입니다.' });
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
}

