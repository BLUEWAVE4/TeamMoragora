// Solo 모드: AI 반대 주장 생성 서비스
// GPT-4o만 사용 (비용 효율 + 품질 균형)

import { openai } from '../../config/ai.js';
import { buildCounterArgumentPrompt } from './prompts.js';
import { callAI } from './aiWrapper.js';
import { AI_TEMPERATURE_SOLO, ARGUMENT_MIN_LENGTH } from '../../config/constants.js';

export async function generateCounterArgument({ topic, category, sideA_argument }) {
  const prompt = buildCounterArgumentPrompt({ topic, category, sideA_argument });

  const parsed = await callAI(
    'GPT-4o (Solo)',
    () => openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: '당신은 논쟁에서 반대 측 주장을 생성하는 AI입니다. 논리적이고 설득력 있는 반대 주장을 작성합니다. 반드시 JSON 형식으로만 응답하세요.',
        },
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
