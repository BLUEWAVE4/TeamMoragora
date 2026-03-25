import { supabaseAdmin } from '../config/supabase.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../errors/index.js';
import { filterByDictionary } from '../services/contentFilter.service.js';
import { triggerJudgment } from '../services/judgmentTrigger.service.js';
import { CHAT_MAX_LENGTH, CHAT_MAX_MESSAGES, CHAT_COOLDOWN, CHAT_TIME_LIMIT } from '../config/constants.js';

// ===== 메시지 전송 =====
export async function sendMessage(req, res, next) {
  try {
    const { debateId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // 메시지 내용 검증
    if (!content || typeof content !== 'string') {
      throw new ValidationError('메시지 내용을 입력해주세요.');
    }
    const trimmed = content.trim();
    if (trimmed.length < 1 || trimmed.length > CHAT_MAX_LENGTH) {
      throw new ValidationError(`메시지는 1~${CHAT_MAX_LENGTH}자 사이여야 합니다.`);
    }

    // 논쟁 조회
    const { data: debate, error: debateErr } = await supabaseAdmin
      .from('debates')
      .select('*')
      .eq('id', debateId)
      .single();

    if (debateErr || !debate) throw new NotFoundError('논쟁을 찾을 수 없습니다.');

    // 상태 검증 (chat 모드: waiting/chatting 허용, 첫 메시지 시 자동 chatting 전환)
    const allowedStatuses = ['chatting', 'waiting', 'both_joined', 'arguing'];
    if (!allowedStatuses.includes(debate.status)) {
      throw new ConflictError('채팅 중인 논쟁이 아닙니다.');
    }
    if (debate.status !== 'chatting') {
      const now = new Date();
      const CHAT_DURATION_MS = 15 * 60 * 1000;
      await supabaseAdmin.from('debates').update({
        status: 'chatting',
        chat_started_at: now.toISOString(),
        chat_deadline: debate.chat_deadline || new Date(now.getTime() + CHAT_DURATION_MS).toISOString(),
      }).eq('id', debateId);
    }

    // 참여자 확인 + side 결정 (chat 모드: opponent 미등록 시 자동 등록)
    let side;
    if (userId === debate.creator_id) {
      side = 'A';
    } else if (userId === debate.opponent_id) {
      side = 'B';
    } else if (debate.mode === 'chat' && !debate.opponent_id) {
      // chat 모드에서 opponent 미등록 → 자동 B측 등록
      await supabaseAdmin.from('debates').update({ opponent_id: userId }).eq('id', debateId);
      side = 'B';
    } else {
      throw new ForbiddenError('이 논쟁의 참여자만 채팅할 수 있습니다.');
    }

    // 1인당 메시지 수 제한
    const { count, error: countErr } = await supabaseAdmin
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('debate_id', debateId)
      .eq('user_id', userId);

    if (countErr) throw countErr;
    if (count >= CHAT_MAX_MESSAGES) {
      throw new ValidationError(`1인당 최대 ${CHAT_MAX_MESSAGES}개까지 전송할 수 있습니다.`);
    }

    // 쿨다운 검사 (마지막 메시지 이후 1초)
    const { data: lastMsg } = await supabaseAdmin
      .from('chat_messages')
      .select('created_at')
      .eq('debate_id', debateId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastMsg) {
      const elapsed = Date.now() - new Date(lastMsg.created_at).getTime();
      if (elapsed < CHAT_COOLDOWN) {
        throw new ValidationError('메시지를 너무 빠르게 전송하고 있습니다.');
      }
    }

    // 비속어 필터 (Stage 1)
    const dictResult = filterByDictionary(trimmed);
    if (dictResult.blocked) {
      throw new ValidationError('부적절한 표현이 포함되어 있습니다.');
    }

    // 닉네임 조회
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('nickname')
      .eq('id', userId)
      .single();

    const nickname = profile?.nickname || '익명';

    // 메시지 저장
    const { data: saved, error: insertErr } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        debate_id: debateId,
        user_id: userId,
        nickname,
        content: trimmed,
        side,
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    // Socket.io 브로드캐스트
    try {
      const { io } = await import('../../server.js');
      io.to(debateId).emit('new-message', saved);
    } catch { /* socket 없으면 무시 */ }

    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
}

// ===== 메시지 목록 조회 =====
export async function getMessages(req, res, next) {
  try {
    const { debateId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('debate_id', debateId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// ===== 채팅 시작 =====
export async function startChat(req, res, next) {
  try {
    const { debateId } = req.params;
    const userId = req.user.id;

    // 논쟁 조회
    const { data: debate, error: debateErr } = await supabaseAdmin
      .from('debates')
      .select('*')
      .eq('id', debateId)
      .single();

    if (debateErr || !debate) throw new NotFoundError('논쟁을 찾을 수 없습니다.');

    // 참여자 확인
    if (userId !== debate.creator_id && userId !== debate.opponent_id) {
      throw new ForbiddenError('이 논쟁의 참여자만 채팅을 시작할 수 있습니다.');
    }

    // 양측 참여자 확인
    if (!debate.creator_id || !debate.opponent_id) {
      throw new ConflictError('양측 참여자가 모두 있어야 채팅을 시작할 수 있습니다.');
    }

    // 상태 검증 (both_joined 또는 arguing에서 chatting으로 전환)
    if (debate.status !== 'both_joined' && debate.status !== 'arguing') {
      throw new ConflictError('현재 상태에서는 채팅을 시작할 수 없습니다.');
    }

    // 원자적 상태 전환
    const chatStartedAt = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('debates')
      .update({
        status: 'chatting',
        chat_started_at: chatStartedAt,
      })
      .eq('id', debateId)
      .select('id')
      .single();

    if (updateErr) throw updateErr;
    if (!updated) throw new ConflictError('채팅 시작에 실패했습니다.');

    res.json({
      chat_started_at: chatStartedAt,
      time_limit: CHAT_TIME_LIMIT,
    });
  } catch (err) {
    next(err);
  }
}

// ===== 채팅 종료 → 판결 요청 =====
export async function endChat(req, res, next) {
  try {
    const { debateId } = req.params;
    const userId = req.user.id;

    // 논쟁 조회
    const { data: debate, error: debateErr } = await supabaseAdmin
      .from('debates')
      .select('*')
      .eq('id', debateId)
      .single();

    if (debateErr || !debate) throw new NotFoundError('논쟁을 찾을 수 없습니다.');

    // 참여자 확인
    if (userId !== debate.creator_id && userId !== debate.opponent_id) {
      throw new ForbiddenError('이 논쟁의 참여자만 채팅을 종료할 수 있습니다.');
    }

    // 상태 검증
    if (debate.status !== 'chatting') {
      throw new ConflictError('채팅 중인 논쟁만 종료할 수 있습니다.');
    }

    // 원자적 상태 전환 (chatting → judging)
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('debates')
      .update({ status: 'judging' })
      .eq('id', debateId)
      .eq('status', 'chatting')
      .select('id')
      .single();

    if (updateErr || !updated) {
      throw new ConflictError('채팅 종료에 실패했습니다.');
    }

    // 비동기로 판결 트리거 (채팅 모드)
    triggerJudgment(debateId).catch(err => {
      console.error(`[endChat] 판결 트리거 실패 (debate: ${debateId}):`, err.message);
    });

    res.json({ status: 'judging' });
  } catch (err) {
    next(err);
  }
}
