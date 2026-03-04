import { judgeWithGPT } from './openai.service.js';
import { judgeWithGemini } from './gemini.service.js';
import { judgeWithClaude } from './claude.service.js';
import { judgeWithGrok } from './grok.service.js';

// 3-model 병렬 판결: Promise.allSettled로 부분 실패 허용
// 실패 모델이 있으면 Grok으로 대체하여 최소 3개 판결 보장
export async function runParallelJudgment(debateContext) {
  const MODELS = ['GPT-4o', 'Gemini', 'Claude'];

  const results = await Promise.allSettled([
    judgeWithGPT(debateContext),
    judgeWithGemini(debateContext),
    judgeWithClaude(debateContext),
  ]);

  const judgments = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  const failedCount = results.filter((r) => r.status === 'rejected').length;

  // Log failures
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[AI] ${MODELS[i]} 판결 실패:`, r.reason?.message);
    }
  });

  // Fallback: 실패한 모델 수만큼 Grok으로 대체
  if (failedCount > 0 && process.env.GROK_API_KEY) {
    console.log(`[AI] ${failedCount}개 모델 실패 → Grok 대체 판결 시도`);
    try {
      const grokResult = await judgeWithGrok(debateContext);
      judgments.push(grokResult);
    } catch (err) {
      console.warn('[AI] Grok 대체 판결도 실패:', err.message);
    }
  }

  if (judgments.length === 0) {
    throw new Error('모든 AI 모델(Grok 포함)이 응답에 실패했습니다.');
  }

  return judgments;
}
