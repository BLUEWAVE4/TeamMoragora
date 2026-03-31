// Solo 모드: AI 반대 주장 생성 서비스
// GPT-5-mini 사용 (비용 절감)

import { openai } from '../../config/ai.js';
import { buildCounterArgumentPrompt } from './prompts.js';
import { callAI } from './aiWrapper.js';
import { AI_TEMPERATURE_SOLO, ARGUMENT_MIN_LENGTH } from '../../config/constants.js';

export async function generateCounterArgument({ topic, category, sideA_argument, round = 1, previousArgs = [] }) {
  const prompt = buildCounterArgumentPrompt({ topic, category, sideA_argument, round, previousArgs });

  const systemMsg = round === 1
    ? '당신은 논쟁에서 반대 측 입장을 전개하는 AI입니다. A측을 직접 반박하지 않고, B측만의 독립적인 주장을 작성합니다. 반드시 JSON 형식으로만 응답하세요.'
    : '당신은 논쟁에서 반대 측 반박을 작성하는 AI입니다. A측 주장의 허점을 논리적으로 반박하고 B측 입장을 보강합니다. 반드시 JSON 형식으로만 응답하세요.';

  const parsed = await callAI(
    'GPT-4.1-mini (Solo)',
    () => openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: AI_TEMPERATURE_SOLO,
    }),
    (res) => res.choices[0].message.content,
  );

  if (!parsed.content || parsed.content.length < ARGUMENT_MIN_LENGTH) {
    throw new Error('AI 반대 주장 생성 실패: 내용이 부족합니다.');
  }

  return parsed;
}
