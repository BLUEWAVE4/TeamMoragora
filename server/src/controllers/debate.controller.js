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
    const debateMode = ['duo', 'solo'].includes(mode) ? mode : 'duo';

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

export async function listDebates(_req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('debates')
      .select('*, creator:profiles!creator_id(nickname)')
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
      .select('*')
      .eq('invite_code', inviteCode)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Debate not found' });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
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

    const { data, error } = await supabaseAdmin
      .from('debates')
      .update({ opponent_id: req.user.id, status: 'arguing' })
      .eq('id', debate.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

