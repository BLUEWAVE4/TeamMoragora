import { openai } from '../../config/ai.js';
import { buildJudgmentPrompt } from './prompts.js';

export async function judgeWithGPT(debateContext) {
  const prompt = buildJudgmentPrompt(debateContext);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  return {
    ai_model: 'gpt-4o',
    ...JSON.parse(response.choices[0].message.content),
  };
}
