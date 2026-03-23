import { supabaseAdmin } from '../../config/supabase.js';
import { judgeWithGPT } from './openai.service.js';
import { judgeWithGemini } from './gemini.service.js';
import { judgeWithClaude } from './claude.service.js';
import { judgeWithGrok } from './grok.service.js';
import {
  AI_RETRY_DELAY_MS,
  SCORE_DETAIL_MIN, SCORE_DETAIL_MAX,
  CONFIDENCE_MIN, CONFIDENCE_MAX, CONFIDENCE_DEFAULT,
  VERDICT_TEXT_MAX_LENGTH,
} from '../../config/constants.js';
import { env } from '../../config/env.js';

// ===== AI 응답 유효성 검증 =====

const REQUIRED_FIELDS = ['winner_side', 'score_a', 'score_b', 'score_detail_a', 'score_detail_b', 'verdict_text', 'confidence'];
const VALID_CRITERIA = ['logic', 'evidence', 'persuasion', 'consistency', 'expression'];
const DETAIL_KEYS = ['logic', 'evidence', 'persuasion', 'consistency', 'expression'];

/**
 * AI 판결 응답 검증 + 자동 보정
 */
export function validateAndCorrectVerdict(raw) {
  for (const field of REQUIRED_FIELDS) {
    if (raw[field] === undefined || raw[field] === null) {
      throw new Error(`AI 응답에 필수 필드 누락: ${field}`);
    }
  }

  if (!['A', 'B', 'draw'].includes(raw.winner_side)) {
    throw new Error(`잘못된 winner_side: ${raw.winner_side}`);
  }

  const correctDetail = (detail) => {
    const corrected = {};
    for (const key of DETAIL_KEYS) {
      const val = Number(detail?.[key]) || 0;
      corrected[key] = Math.max(SCORE_DETAIL_MIN, Math.min(SCORE_DETAIL_MAX, Math.round(val)));
    }
    return corrected;
  };

  raw.score_detail_a = correctDetail(raw.score_detail_a);
  raw.score_detail_b = correctDetail(raw.score_detail_b);

  const sumA = DETAIL_KEYS.reduce((s, k) => s + raw.score_detail_a[k], 0);
  const sumB = DETAIL_KEYS.reduce((s, k) => s + raw.score_detail_b[k], 0);
  raw.score_a = sumA;
  raw.score_b = sumB;

  raw.confidence = Math.max(CONFIDENCE_MIN, Math.min(CONFIDENCE_MAX, Number(raw.confidence) || CONFIDENCE_DEFAULT));

  if (raw.winner_side === 'A' && raw.score_a < raw.score_b) {
    raw.winner_side = 'B';
  } else if (raw.winner_side === 'B' && raw.score_b < raw.score_a) {
    raw.winner_side = 'A';
  } else if (raw.score_a === raw.score_b) {
    raw.winner_side = 'draw';
  }

  if (typeof raw.verdict_text === 'string') {
    raw.verdict_text = raw.verdict_text.slice(0, VERDICT_TEXT_MAX_LENGTH);
  }

  // verdict_sections 검증/보정 (없으면 빈 배열)
  if (Array.isArray(raw.verdict_sections)) {
    raw.verdict_sections = raw.verdict_sections
      .filter(s => s && VALID_CRITERIA.includes(s.criterion) && typeof s.text === 'string')
      .map(s => ({ criterion: s.criterion, text: s.text.slice(0, 500) }));
  } else {
    raw.verdict_sections = [];
  }

  return raw;
}

// ===== 재시도 래퍼 (1회 재시도) =====

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function callWithRetry(fn, modelName) {
  try {
    return await fn();
  } catch (firstErr) {
    console.warn(`[AI] ${modelName} 1차 실패: ${firstErr.message} → ${AI_RETRY_DELAY_MS / 1000}초 후 재시도`);
    await delay(AI_RETRY_DELAY_MS);
    try {
      return await fn();
    } catch (retryErr) {
      throw new Error(`${modelName} 재시도 실패: ${retryErr.message}`);
    }
  }
}

// ===== 개별 AI 결과 즉시 DB 저장 =====

async function saveJudgmentImmediately(verdictId, judgment) {
  try {
    await supabaseAdmin.from('ai_judgments').insert({
      verdict_id: verdictId,
      ai_model: judgment.ai_model,
      winner_side: judgment.winner_side,
      verdict_text: judgment.verdict_text,
      verdict_sections: judgment.verdict_sections || [],
      score_a: judgment.score_a,
      score_b: judgment.score_b,
      score_detail_a: judgment.score_detail_a,
      score_detail_b: judgment.score_detail_b,
      confidence: judgment.confidence,
    });
    console.log(`[AI] ${judgment.ai_model} 결과 즉시 저장 완료`);
  } catch (err) {
    console.error(`[AI] ${judgment.ai_model} 결과 저장 실패:`, err.message);
  }
}

// ===== 3-model 병렬 판결 (결과 즉시 저장) =====

export async function runParallelJudgment(debateContext, verdictId) {
  const MODELS = ['GPT-4o', 'Gemini', 'Claude'];
  const judgments = [];
  const failedModels = [];

  const tasks = [
    callWithRetry(() => judgeWithGPT(debateContext), 'GPT-4o'),
    callWithRetry(() => judgeWithGemini(debateContext), 'Gemini'),
    callWithRetry(() => judgeWithClaude(debateContext), 'Claude'),
  ];

  const wrappedTasks = tasks.map((task, i) =>
    task
      .then(async (result) => {
        const validated = validateAndCorrectVerdict(result);
        if (verdictId) await saveJudgmentImmediately(verdictId, validated);
        judgments.push(validated);
        return { status: 'ok', model: MODELS[i] };
      })
      .catch((err) => {
        console.warn(`[AI] ${MODELS[i]} 판결 실패:`, err.message);
        failedModels.push(MODELS[i]);
        return { status: 'fail', model: MODELS[i] };
      })
  );

  await Promise.all(wrappedTasks);

  // Grok 폴백
  if (failedModels.length > 0 && env.GROK_API_KEY) {
    const grokAttempts = Math.min(failedModels.length, 2);
    console.log(`[AI] ${failedModels.join(', ')} 실패 → Grok 대체 ${grokAttempts}회 시도`);

    for (let i = 0; i < grokAttempts; i++) {
      try {
        const grokResult = await judgeWithGrok(debateContext);
        const validated = validateAndCorrectVerdict(grokResult);
        if (verdictId) await saveJudgmentImmediately(verdictId, validated);
        judgments.push(validated);
      } catch (err) {
        console.warn(`[AI] Grok 대체 판결 ${i + 1}회 실패:`, err.message);
      }
    }
  }

  if (judgments.length === 0) {
    throw new Error('모든 AI 모델(Grok 포함)이 응답에 실패했습니다.');
  }

  console.log(`[AI] 판결 완료: ${judgments.length}개 성공 (${judgments.map(j => j.ai_model).join(', ')})`);
  return judgments;
}

// ===== 단일 모델 재판결 =====

const MODEL_FN_MAP = {
  gpt: { fn: judgeWithGPT, name: 'GPT-4o', aiModel: 'gpt-4o' },
  gemini: { fn: judgeWithGemini, name: 'Gemini', aiModel: 'gemini-2.5-flash' },
  claude: { fn: judgeWithClaude, name: 'Claude', aiModel: 'claude-sonnet' },
};

export async function retrySingleJudgment(model, debateContext, verdictId) {
  const config = MODEL_FN_MAP[model];
  if (!config) throw new Error(`알 수 없는 모델: ${model}`);

  console.log(`[AI] ${config.name} 재판결 시작...`);

  // 기존 해당 모델 판결 삭제
  await supabaseAdmin
    .from('ai_judgments')
    .delete()
    .eq('verdict_id', verdictId)
    .eq('ai_model', config.aiModel);

  // 재판결 실행
  const result = await callWithRetry(() => config.fn(debateContext), config.name);
  const validated = validateAndCorrectVerdict(result);
  await saveJudgmentImmediately(verdictId, validated);

  console.log(`[AI] ${config.name} 재판결 완료: A=${validated.score_a} B=${validated.score_b}`);
  return validated;
}
