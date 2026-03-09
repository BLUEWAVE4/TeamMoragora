// Solo 모드: AI 반대 주장 생성 서비스
// GPT-4o만 사용 (비용 효율 + 품질 균형)

import { openai } from '../../config/ai.js';
import { buildCounterArgumentPrompt } from './prompts.js';

const TIMEOUT_MS = 30000;

export async function generateCounterArgument({ topic, category, sideA_argument }) {
  const prompt = buildCounterArgumentPrompt({ topic, category, sideA_argument });

  const response = await Promise.race([
    openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: '당신은 논쟁에서 반대 측 주장을 생성하는 AI입니다. 논리적이고 설득력 있는 반대 주장을 작성합니다. 반드시 JSON 형식으로만 응답하세요.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI 반대 주장 생성 타임아웃 (30초)')), TIMEOUT_MS)
    ),
  ]);

  const parsed = JSON.parse(response.choices[0].message.content);

  if (!parsed.content || parsed.content.length < 50) {
    throw new Error('AI 반대 주장 생성 실패: 내용이 부족합니다.');
  }

  return parsed;
}
