import { gemini } from '../../config/ai.js';
import { buildJudgmentPrompt } from './prompts.js';

const TIMEOUT_MS = 30000;

export async function judgeWithGemini(debateContext) {
  const prompt = buildJudgmentPrompt(debateContext);

  const result = await Promise.race([
    gemini.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini 응답 타임아웃 (30초)')), TIMEOUT_MS)
    ),
  ]);

  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini 응답에서 JSON을 찾을 수 없습니다.');

  return { ai_model: 'gemini-2.5-flash', ...JSON.parse(jsonMatch[0]) };
}
