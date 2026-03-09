import { judgeWithGPT } from './openai.service.js';
import { judgeWithGemini } from './gemini.service.js';
import { judgeWithClaude } from './claude.service.js';
import { judgeWithGrok } from './grok.service.js';

// ===== AI 응답 유효성 검증 =====

const REQUIRED_FIELDS = ['winner_side', 'score_a', 'score_b', 'score_detail_a', 'score_detail_b', 'verdict_text', 'confidence'];
const DETAIL_KEYS = ['logic', 'evidence', 'persuasion', 'consistency', 'expression'];

/**
 * AI 판결 응답 검증 + 자동 보정
 * - 필수 필드 존재 확인
 * - 점수 범위 클램핑 (0~20 / 0~100)
 * - score_a = 5항목 합 정합성 보정
 * - confidence 범위 보정 (0.50~1.00)
 * - winner_side와 점수 정합성 검증
 */
export function validateAndCorrectVerdict(raw) {
  // 필수 필드 확인
  for (const field of REQUIRED_FIELDS) {
    if (raw[field] === undefined || raw[field] === null) {
      throw new Error(`AI 응답에 필수 필드 누락: ${field}`);
    }
  }

  // winner_side 유효값
  if (!['A', 'B', 'draw'].includes(raw.winner_side)) {
    throw new Error(`잘못된 winner_side: ${raw.winner_side}`);
  }

  // score_detail 보정 (각 항목 0~20 클램핑)
  const correctDetail = (detail) => {
    const corrected = {};
    for (const key of DETAIL_KEYS) {
      const val = Number(detail?.[key]) || 0;
      corrected[key] = Math.max(0, Math.min(20, Math.round(val)));
    }
    return corrected;
  };

  raw.score_detail_a = correctDetail(raw.score_detail_a);
  raw.score_detail_b = correctDetail(raw.score_detail_b);

  // total = 5항목 합 (AI가 계산 실수할 수 있음)
  const sumA = DETAIL_KEYS.reduce((s, k) => s + raw.score_detail_a[k], 0);
  const sumB = DETAIL_KEYS.reduce((s, k) => s + raw.score_detail_b[k], 0);
  raw.score_a = sumA;
  raw.score_b = sumB;

  // confidence 범위 보정
  raw.confidence = Math.max(0.50, Math.min(1.00, Number(raw.confidence) || 0.65));

  // winner_side와 점수 정합성: 점수가 뒤집혀 있으면 점수 기준으로 보정
  if (raw.winner_side === 'A' && raw.score_a < raw.score_b) {
    raw.winner_side = 'B';
  } else if (raw.winner_side === 'B' && raw.score_b < raw.score_a) {
    raw.winner_side = 'A';
  } else if (raw.score_a === raw.score_b) {
    raw.winner_side = 'draw';
  }

  // verdict_text 길이 제한
  if (typeof raw.verdict_text === 'string') {
    raw.verdict_text = raw.verdict_text.slice(0, 2000);
  }

  return raw;
}

// ===== 재시도 래퍼 (1회 재시도) =====

async function callWithRetry(fn, modelName) {
  try {
    return await fn();
  } catch (firstErr) {
    console.warn(`[AI] ${modelName} 1차 실패: ${firstErr.message} → 재시도`);
    try {
      return await fn();
    } catch (retryErr) {
      throw new Error(`${modelName} 재시도 실패: ${retryErr.message}`);
    }
  }
}

// ===== 3-model 병렬 판결 =====

export async function runParallelJudgment(debateContext) {
  const MODELS = ['GPT-4o', 'Gemini', 'Claude'];

  // 1. 3개 AI 병렬 호출 (각 1회 재시도 포함)
  const results = await Promise.allSettled([
    callWithRetry(() => judgeWithGPT(debateContext), 'GPT-4o'),
    callWithRetry(() => judgeWithGemini(debateContext), 'Gemini'),
    callWithRetry(() => judgeWithClaude(debateContext), 'Claude'),
  ]);

  // 2. 성공 결과 수집 + 응답 검증
  const judgments = [];
  const failedModels = [];

  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      try {
        const validated = validateAndCorrectVerdict(r.value);
        judgments.push(validated);
      } catch (validErr) {
        console.warn(`[AI] ${MODELS[i]} 응답 검증 실패:`, validErr.message);
        failedModels.push(MODELS[i]);
      }
    } else {
      console.warn(`[AI] ${MODELS[i]} 판결 실패:`, r.reason?.message);
      failedModels.push(MODELS[i]);
    }
  });

  // 3. Grok 폴백: 실패한 모델 수만큼 대체 시도 (최대 2회)
  if (failedModels.length > 0 && process.env.GROK_API_KEY) {
    const grokAttempts = Math.min(failedModels.length, 2);
    console.log(`[AI] ${failedModels.join(', ')} 실패 → Grok 대체 ${grokAttempts}회 시도`);

    for (let i = 0; i < grokAttempts; i++) {
      try {
        const grokResult = await judgeWithGrok(debateContext);
        const validated = validateAndCorrectVerdict(grokResult);
        judgments.push(validated);
      } catch (err) {
        console.warn(`[AI] Grok 대체 판결 ${i + 1}회 실패:`, err.message);
      }
    }
  }

  // 4. 최소 1개 이상 필요
  if (judgments.length === 0) {
    throw new Error('모든 AI 모델(Grok 포함)이 응답에 실패했습니다.');
  }

  console.log(`[AI] 판결 완료: ${judgments.length}개 성공 (${judgments.map(j => j.ai_model).join(', ')})`);
  return judgments;
}
