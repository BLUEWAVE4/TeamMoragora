import { anthropic } from '../../config/ai.js';
import { buildSystemPrompt, buildUserPrompt } from './prompts.js';
import { callAI } from './aiWrapper.js';
import { AI_MAX_TOKENS_CLAUDE } from '../../config/constants.js';

export async function judgeWithClaude(debateContext) {
  const systemPrompt = buildSystemPrompt('claude-sonnet');
  const userPrompt = buildUserPrompt(debateContext);

  const parsed = await callAI(
    'Claude',
    () => anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: AI_MAX_TOKENS_CLAUDE,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
    (res) => res.content[0].text,
  );

  return { ai_model: 'claude-sonnet', ...parsed };
}
