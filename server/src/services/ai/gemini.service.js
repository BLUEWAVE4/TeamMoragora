import { gemini } from '../../config/ai.js';
import { buildJudgmentPrompt } from './prompts.js';

export async function judgeWithGemini(debateContext) {
  const prompt = buildJudgmentPrompt(debateContext);

  const result = await gemini.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
  });

  const text = result.response.text();
  return {
    ai_model: 'gemini-2.0-flash',
    ...JSON.parse(text),
  };
}
