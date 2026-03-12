import { openai } from '../../config/ai.js';
import { buildSystemPrompt, buildUserPrompt } from './prompts.js';
import { callAI } from './aiWrapper.js';
import { AI_TEMPERATURE_JUDGE } from '../../config/constants.js';

export async function judgeWithGPT(debateContext) {
  const systemPrompt = buildSystemPrompt('gpt-4o');
  const userPrompt = buildUserPrompt(debateContext);

  const parsed = await callAI(
    'GPT-4o',
    () => openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: AI_TEMPERATURE_JUDGE,
    }),
    (res) => res.choices[0].message.content,
  );

  return { ai_model: 'gpt-4o', ...parsed };
}
