import { supabaseAdmin } from '../config/supabase.js';
import { nanoid } from '../utils/nanoid.js';

export async function createDebate(req, res, next) {
  try {
    const { topic, description, category, purpose, lens, mode } = req.body;

    if (!topic?.trim()) {
      return res.status(400).json({ error: '주제를 입력해주세요.' });
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
      .single();

    if (error) throw error;
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

    const { data: debate, error: findErr } = await supabaseAdmin
      .from('debates')
      .select('*')
      .eq('invite_code', inviteCode)
      .eq('status', 'waiting')
      .is('opponent_id', null)
      .single();

    if (findErr || !debate) {
      return res.status(404).json({ error: '유효하지 않은 초대 코드입니다.' });
    }

    if (debate.creator_id === req.user.id) {
      return res.status(400).json({ error: '자신의 논쟁에 참여할 수 없습니다.' });
    }

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

