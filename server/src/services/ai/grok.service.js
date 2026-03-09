import { grok } from '../../config/ai.js';
import { buildSystemPrompt, buildUserPrompt } from './prompts.js';

const TIMEOUT_MS = 30000;

export async function judgeWithGrok(debateContext) {
  const systemPrompt = buildSystemPrompt('grok-3-mini');
  const userPrompt = buildUserPrompt(debateContext);

  const response = await Promise.race([
    grok.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Grok 응답 타임아웃 (30초)')), TIMEOUT_MS)
    ),
  ]);

  const raw = response.choices[0].message.content;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Grok 응답에서 JSON을 찾을 수 없습니다.');
    parsed = JSON.parse(jsonMatch[0]);
  }
  return { ai_model: 'grok-3-mini', ...parsed };
}
