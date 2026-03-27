import { supabaseAdmin } from '../config/supabase.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../errors/index.js';
import { filterByDictionary } from '../services/contentFilter.service.js';
import { triggerJudgment } from '../services/judgmentTrigger.service.js';
import { CHAT_MAX_LENGTH, CHAT_MAX_MESSAGES, CHAT_COOLDOWN, CHAT_TIME_LIMIT, CHAT_DURATION_MS } from '../config/constants.js';

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
      .select('id, status, mode, creator_id, opponent_id, topic, category')
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
      .select('id, debate_id, user_id, nickname, content, side, created_at')
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
      .select('id, debate_id, user_id, nickname, content, side, created_at')
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
      .select('id, status, mode, creator_id, opponent_id, topic, category')
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
      .select('id, status, mode, creator_id, opponent_id, topic, category')
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

// ===== 유저 신고 (AI 분석) =====
export async function reportUser(req, res, next) {
  try {
    const { debateId } = req.params;
    const { reporterId, targetId } = req.body;

    if (!targetId) throw new ValidationError('신고 대상이 지정되지 않았습니다.');

    // DB에서 해당 유저의 실제 채팅 메시지 조회 (클라이언트 데이터 신뢰 방지)
    const { data: chatMessages } = await supabaseAdmin
      .from('chat_messages')
      .select('content, created_at')
      .eq('debate_id', debateId)
      .eq('user_id', targetId)
      .order('created_at', { ascending: true });

    if (!chatMessages || chatMessages.length === 0) {
      return res.json({ flagged: false, reason: '해당 유저의 메시지가 없습니다.' });
    }

    const allContent = chatMessages.map(m => m.content).join('\n');

    // 1단계: 비속어 사전 필터 (빠른 차단)
    const filterResult = filterByDictionary(allContent);
    if (filterResult.blocked) {
      await supabaseAdmin.from('reports').insert({
        debate_id: debateId,
        reporter_id: reporterId || null,
        target_id: targetId,
        reason: filterResult.reason,
        flagged: true,
        analyzed_content: allContent.slice(0, 2000),
      }).catch(() => {});
      return res.json({ flagged: true, reason: `부적절한 표현이 감지되었습니다: ${filterResult.reason}` });
    }

    // 2단계: AI 분석 (Gemini Flash — 빠르고 저렴)
    const { gemini } = await import('../config/ai.js');
    const prompt = `당신은 온라인 논쟁 플랫폼의 채팅 감시 AI입니다.
아래는 신고된 유저의 채팅 로그입니다. 다음 기준으로 분석하세요:

## 판단 기준
1. **비속어/욕설**: 직접적 욕설, 우회 욕설, 비하 표현
2. **인신공격**: 상대방 인격/외모/능력에 대한 모욕
3. **혐오 표현**: 성별/인종/종교/장애 등에 대한 차별 발언
4. **위협/폭력**: 신체적 위해 암시, 자해/자살 언급
5. **성적 표현**: 부적절한 성적 발언
6. **도배/트롤링**: 논쟁과 무관한 반복적 방해 행위

## 채팅 로그
${allContent.slice(0, 3000)}

## 응답 형식 (JSON만 출력)
{
  "flagged": true/false,
  "severity": "none" | "low" | "medium" | "high",
  "categories": ["해당 카테고리"],
  "reason": "한국어로 구체적 사유 1-2문장"
}`;

    let aiResult;
    try {
      const result = await gemini.generateContent(prompt);
      const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
      aiResult = JSON.parse(text);
    } catch (aiErr) {
      console.error('[신고 AI 분석 실패]', aiErr.message);
      // AI 실패 시 기본 패턴 분석 폴백
      const harmfulPatterns = [
        { pattern: /죽|자살|살인/gi, label: '위험한 표현' },
        { pattern: /(바보|멍청|등신|병신|지체|장애)/gi, label: '인신공격' },
        { pattern: /(성별|인종|종교|외국인|이주민).*(차별|혐오|꺼져|나가)/gi, label: '혐오 표현' },
      ];
      for (const { pattern, label } of harmfulPatterns) {
        if (pattern.test(allContent)) {
          aiResult = { flagged: true, severity: 'medium', categories: [label], reason: `${label}이(가) 감지되었습니다.` };
          break;
        }
      }
      if (!aiResult) {
        aiResult = { flagged: false, severity: 'none', categories: [], reason: 'AI 분석을 수행할 수 없어 패턴 분석을 진행했습니다. 부적절한 내용이 감지되지 않았습니다.' };
      }
    }

    // 신고 기록 저장
    await supabaseAdmin.from('reports').insert({
      debate_id: debateId,
      reporter_id: reporterId || null,
      target_id: targetId,
      reason: aiResult.reason,
      flagged: aiResult.flagged,
      analyzed_content: allContent.slice(0, 2000),
    }).catch(() => {});

    // 신고 대상에게 알림 (위반 감지 시)
    if (aiResult.flagged && targetId) {
      const { createNotification } = await import('../services/notification.service.js');
      await createNotification({
        userId: targetId,
        type: 'reported',
        title: '채팅 내용이 신고되었습니다',
        message: aiResult.reason || '부적절한 표현이 감지되었습니다.',
        link: `/debate/${debateId}/chat`,
      }).catch(() => {});
    }

    res.json({
      flagged: aiResult.flagged,
      severity: aiResult.severity,
      categories: aiResult.categories,
      reason: aiResult.reason,
    });
  } catch (err) {
    next(err);
  }
}

// ===== 시민 실시간 투표 (chatting 중 관전자) =====
export async function castCitizenVote(req, res, next) {
  try {
    const { debateId } = req.params;
    const userId = req.user.id;
    const { voted_side } = req.body;

    if (!['A', 'B'].includes(voted_side)) {
      return res.status(400).json({ error: 'voted_side는 A 또는 B여야 합니다.' });
    }

    // 논쟁 확인 — chatting 상태에서만 투표 가능
    const { data: debate } = await supabaseAdmin
      .from('debates').select('creator_id, opponent_id, status').eq('id', debateId).single();
    if (!debate) return res.status(404).json({ error: '논쟁을 찾을 수 없습니다.' });
    if (debate.status !== 'chatting') return res.status(400).json({ error: '투표할 수 없는 상태입니다.' });

    // 당사자는 투표 불가
    if (userId === debate.creator_id || userId === debate.opponent_id) {
      return res.status(403).json({ error: '논쟁 당사자는 시민 투표에 참여할 수 없습니다.' });
    }

    // upsert — 변경 가능
    const { error } = await supabaseAdmin
      .from('votes')
      .upsert({ debate_id: debateId, user_id: userId, voted_side }, { onConflict: 'debate_id,user_id' });
    if (error) throw error;

    res.json({ voted_side });
  } catch (err) {
    next(err);
  }
}

export async function getCitizenVoteTally(req, res, next) {
  try {
    const { debateId } = req.params;
    const userId = req.user.id;

    const { data: votes } = await supabaseAdmin
      .from('votes').select('voted_side').eq('debate_id', debateId);

    const countA = (votes || []).filter(v => v.voted_side === 'A').length;
    const countB = (votes || []).filter(v => v.voted_side === 'B').length;

    // 내 투표 확인
    const { data: myVote } = await supabaseAdmin
      .from('votes').select('voted_side').eq('debate_id', debateId).eq('user_id', userId).maybeSingle();

    res.json({ A: countA, B: countB, total: countA + countB, myVote: myVote?.voted_side || null });
  } catch (err) {
    next(err);
  }
}
