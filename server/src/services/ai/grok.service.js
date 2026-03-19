import { grok } from '../../config/ai.js';
import { buildSystemPrompt, buildUserPrompt } from './prompts.js';
import { callAI } from './aiWrapper.js';
import { AI_TEMPERATURE_JUDGE } from '../../config/constants.js';

export async function judgeWithGrok(debateContext) {
  const systemPrompt = buildSystemPrompt('grok-3-mini', debateContext.lens);
  const userPrompt = buildUserPrompt(debateContext);

  const parsed = await callAI(
    'Grok',
    () => grok.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: AI_TEMPERATURE_JUDGE,
    }),
    (res) => res.choices[0].message.content,
  );

  return { ai_model: 'grok-3-mini', ...parsed };
}
