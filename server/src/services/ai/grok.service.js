import { grok } from '../../config/ai.js';
import { buildJudgmentPrompt } from './prompts.js';

export async function judgeWithGrok(debateContext) {
  const prompt = buildJudgmentPrompt(debateContext);

  const response = await grok.chat.completions.create({
    model: 'grok-3-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  return {
    ai_model: 'grok-3-mini',
    ...JSON.parse(response.choices[0].message.content),
  };
}
