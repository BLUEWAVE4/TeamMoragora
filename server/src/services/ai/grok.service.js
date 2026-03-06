import { grok } from '../../config/ai.js';
import { buildJudgmentPrompt } from './prompts.js';

const TIMEOUT_MS = 30000;

export async function judgeWithGrok(debateContext) {
  const prompt = buildJudgmentPrompt(debateContext);

  const response = await Promise.race([
    grok.chat.completions.create({
      model: 'grok-3-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Grok 응답 타임아웃 (30초)')), TIMEOUT_MS)
    ),
  ]);

  const parsed = JSON.parse(response.choices[0].message.content);
  return { ai_model: 'grok-3-mini', ...parsed };
}
