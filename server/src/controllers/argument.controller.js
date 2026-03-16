import { supabaseAdmin } from '../config/supabase.js';
import { preprocessArgument } from '../services/preprocessor.service.js';
import { filterByDictionary, filterByAI } from '../services/contentFilter.service.js';
import { generateCounterArgument } from '../services/ai/solo.service.js';
import { triggerJudgment } from '../services/judgmentTrigger.service.js';
import { CATEGORY_ALL_STAGES } from '../config/constants.js';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../errors/index.js';

// 필터 로그 저장 헬퍼
async function saveFilterLog({ userId, debateId, contentType, stage, reason, result }) {
  try {
    await supabaseAdmin.from('content_filter_logs').insert({
      user_id: userId,
      debate_id: debateId,
      content_type: contentType,
      filter_stage: stage,
      reason: reason || null,
      result,
    });
  } catch (err) {
    console.error('[FilterLog] 저장 실패:', err.message);
  }
}

export async function submitArgument(req, res, next) {
  try {
    const { debateId } = req.params;
    const { content, side } = req.body;
    const userId = req.user.id;

    // === 콘텐츠 필터링 (Stage 1: 비속어 사전) ===
    const dictResult = filterByDictionary(content);
    if (dictResult.blocked) {
      await saveFilterLog({ userId, debateId, contentType: 'argument', stage: 1, reason: dictResult.reason, result: 'block' });
      return res.status(400).json({ error: dictResult.reason });
    }

    // === 논쟁 조회 및 권한/중복 검증 ===
    const { data: debate } = await supabaseAdmin
      .from('debates')
      .select('category, creator_id, opponent_id, status')
      .eq('id', debateId)
      .single();

    if (!debate) throw new NotFoundError('논쟁을 찾을 수 없습니다.');
    if (debate.status !== 'arguing') throw new ValidationError('주장 제출 단계가 아닙니다.');

    // side 검증: creator는 A, opponent는 B만 가능
    if (side === 'A' && debate.creator_id !== userId) {
      throw new ForbiddenError('찬성 주장은 논쟁 생성자만 제출할 수 있습니다.');
    }
    if (side === 'B' && debate.opponent_id !== userId) {
      throw new ForbiddenError('반대 주장은 초대받은 사용자만 제출할 수 있습니다.');
    }

    // 같은 side 중복 제출 방지
    const { data: existingArg } = await supabaseAdmin
      .from('arguments')
      .select('id')
      .eq('debate_id', debateId)
      .eq('side', side)
      .maybeSingle();

    if (existingArg) throw new ConflictError('이미 해당 진영의 주장이 제출되었습니다.');

    // === 콘텐츠 필터링 (Stage 2: AI 유해성 - 사회/정치 카테고리) ===
    if (debate && CATEGORY_ALL_STAGES.includes(debate.category)) {
      const aiResult = await filterByAI(content);
      if (aiResult.action === 'block') {
        await saveFilterLog({ userId, debateId, contentType: 'argument', stage: 2, reason: aiResult.reason, result: 'block' });
        return res.status(400).json({ error: aiResult.reason });
      }
    }

    // 상대측 주장 조회 (유사도 체크용)
    const otherSide = side === 'A' ? 'B' : 'A';
    const { data: otherArg } = await supabaseAdmin
      .from('arguments')
      .select('content')
      .eq('debate_id', debateId)
      .eq('side', otherSide)
      .single();

    // 입력 전처리 (인젝션 방어 + 정규화 + 유효성)
    const result = preprocessArgument(content, otherArg?.content);

    if (result.status === 'empty') {
      return res.status(400).json({ error: '주장 내용을 입력해주세요.' });
    }
    if (result.status === 'too_short') {
      return res.status(400).json({ error: '주장은 50자 이상이어야 합니다.' });
    }
    if (result.status === 'duplicate') {
      return res.status(400).json({ error: '상대측과 동일한 주장은 제출할 수 없습니다.' });
    }

    const { data, error } = await supabaseAdmin
      .from('arguments')
      .insert({
        debate_id: debateId,
        user_id: req.user.id,
        content: result.text,
        side,
      })
      .select()
      .single();

    if (error) throw error;

    // 전처리 경고가 있으면 응답에 포함
    const response = { ...data };
    if (result.warnings.length > 0) {
      response.warnings = result.warnings;
    }

    // 양측 주장 모두 제출 완료 시 비동기로 AI 판결 트리거
    const { count } = await supabaseAdmin
      .from('arguments')
      .select('*', { count: 'exact', head: true })
      .eq('debate_id', debateId);

    if (count >= 2) {
      triggerJudgment(debateId).catch((err) =>
        console.error(`[Auto-Judgment] 판결 트리거 실패 (debate: ${debateId}):`, err.message)
      );
    }

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

// 솔로 모드: AI가 B측 반대 주장 자동 생성
export async function generateSoloArgument(req, res, next) {
  try {
    const { debateId } = req.params;

    // 논쟁 조회
    const { data: debate } = await supabaseAdmin
      .from('debates')
      .select('topic, category, creator_id, status')
      .eq('id', debateId)
      .single();

    if (!debate) throw new NotFoundError('논쟁을 찾을 수 없습니다.');
    if (debate.status !== 'arguing') throw new ValidationError('주장 제출 단계가 아닙니다.');
    if (debate.creator_id !== req.user.id) throw new ForbiddenError('논쟁 생성자만 솔로 모드를 사용할 수 있습니다.');

    // A측 주장 조회
    const { data: sideA } = await supabaseAdmin
      .from('arguments')
      .select('content')
      .eq('debate_id', debateId)
      .eq('side', 'A')
      .single();

    if (!sideA) throw new ValidationError('먼저 A측 주장을 제출해주세요.');

    // 이미 B측 주장이 있으면 거부
    const { data: existingB } = await supabaseAdmin
      .from('arguments')
      .select('id')
      .eq('debate_id', debateId)
      .eq('side', 'B')
      .maybeSingle();

    if (existingB) throw new ConflictError('이미 B측 주장이 존재합니다.');

    // AI 반대 주장 생성
    const aiResult = await generateCounterArgument({
      topic: debate.topic,
      category: debate.category,
      sideA_argument: sideA.content,
    });

    // B측으로 저장 (user_id는 creator — 솔로 모드이므로)
    const { data, error } = await supabaseAdmin
      .from('arguments')
      .insert({
        debate_id: debateId,
        user_id: req.user.id,
        content: aiResult.content,
        side: 'B',
      })
      .select()
      .single();

    if (error) throw error;

    // 솔로 모드: B측 생성 완료 → 비동기로 AI 판결 트리거
    triggerJudgment(debateId).catch((err) =>
      console.error(`[Auto-Judgment] 솔로 판결 트리거 실패 (debate: ${debateId}):`, err.message)
    );

    res.status(201).json({ ...data, ai_generated: true });
  } catch (err) {
    next(err);
  }
}

export async function getArguments(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('arguments')
      .select('*, user:profiles!user_id(nickname)')
      .eq('debate_id', req.params.debateId)
      .order('created_at');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}
