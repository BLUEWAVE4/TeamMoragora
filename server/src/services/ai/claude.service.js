import { anthropic } from '../../config/ai.js';
import { buildJudgmentPrompt } from './prompts.js';

export async function judgeWithClaude(debateContext) {
  const prompt = buildJudgmentPrompt(debateContext);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text;
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return {
    ai_model: 'claude-sonnet',
    ...JSON.parse(jsonMatch[0]),
  };
}
