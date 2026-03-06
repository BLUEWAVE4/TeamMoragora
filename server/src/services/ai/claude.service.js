import { anthropic } from '../../config/ai.js';
import { buildJudgmentPrompt } from './prompts.js';

const TIMEOUT_MS = 30000;

export async function judgeWithClaude(debateContext) {
  const prompt = buildJudgmentPrompt(debateContext);

  const message = await Promise.race([
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Claude 응답 타임아웃 (30초)')), TIMEOUT_MS)
    ),
  ]);

  const text = message.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude 응답에서 JSON을 찾을 수 없습니다.');

  return { ai_model: 'claude-sonnet', ...JSON.parse(jsonMatch[0]) };
}
