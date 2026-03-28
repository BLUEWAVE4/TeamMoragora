import { openai } from '../../config/ai.js';
import { buildSystemPrompt, buildUserPrompt } from './prompts.js';
import { callAI } from './aiWrapper.js';
import { AI_TEMPERATURE_JUDGE } from '../../config/constants.js';

export async function judgeWithGPT(debateContext) {
  const systemPrompt = buildSystemPrompt('o3', debateContext.lens, debateContext.purpose);
  const userPrompt = buildUserPrompt(debateContext);

  const parsed = await callAI(
    'GPT-o3',
    () => openai.chat.completions.create({
      model: 'o3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
    (res) => res.choices[0].message.content,
  );

  return { ai_model: 'o3', ...parsed };
}
