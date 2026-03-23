import { anthropic } from '../../config/ai.js';
import { buildSystemPrompt, buildUserPrompt } from './prompts.js';
import { AI_MAX_TOKENS_CLAUDE } from '../../config/constants.js';

const VERDICT_TOOL = {
  name: 'submit_verdict',
  description: '논쟁에 대한 판결 결과를 JSON으로 제출합니다.',
  input_schema: {
    type: 'object',
    properties: {
      winner_side: { type: 'string', enum: ['A', 'B', 'draw'] },
      score_a: { type: 'integer', description: '0-100' },
      score_b: { type: 'integer', description: '0-100' },
      score_detail_a: {
        type: 'object',
        properties: {
          logic: { type: 'integer' }, evidence: { type: 'integer' },
          persuasion: { type: 'integer' }, consistency: { type: 'integer' }, expression: { type: 'integer' },
        },
        required: ['logic', 'evidence', 'persuasion', 'consistency', 'expression'],
      },
      score_detail_b: {
        type: 'object',
        properties: {
          logic: { type: 'integer' }, evidence: { type: 'integer' },
          persuasion: { type: 'integer' }, consistency: { type: 'integer' }, expression: { type: 'integer' },
        },
        required: ['logic', 'evidence', 'persuasion', 'consistency', 'expression'],
      },
      verdict_text: { type: 'string' },
      verdict_sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: { criterion: { type: 'string' }, text: { type: 'string' } },
          required: ['criterion', 'text'],
        },
      },
      confidence: { type: 'number' },
    },
    required: ['winner_side', 'score_a', 'score_b', 'score_detail_a', 'score_detail_b', 'verdict_text', 'confidence'],
  },
};

export async function judgeWithClaude(debateContext) {
  const systemPrompt = buildSystemPrompt('claude-sonnet', debateContext.lens, debateContext.purpose);
  const userPrompt = buildUserPrompt(debateContext);

  const response = await Promise.race([
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: AI_MAX_TOKENS_CLAUDE,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [VERDICT_TOOL],
      tool_choice: { type: 'tool', name: 'submit_verdict' },
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Claude 응답 타임아웃')), 30000)
    ),
  ]);

  // tool_use 블록에서 input 추출
  const toolBlock = response.content.find(b => b.type === 'tool_use');
  if (!toolBlock?.input) throw new Error('Claude tool_use 응답 없음');

  return { ai_model: 'claude-sonnet', ...toolBlock.input };
}
