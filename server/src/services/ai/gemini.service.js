import { gemini } from '../../config/ai.js';
import { buildSystemPrompt, buildUserPrompt } from './prompts.js';
import { callAI } from './aiWrapper.js';
import { AI_TEMPERATURE_JUDGE } from '../../config/constants.js';

export async function judgeWithGemini(debateContext) {
  const systemPrompt = buildSystemPrompt('gemini-2.5-flash');
  const userPrompt = buildUserPrompt(debateContext);

  const parsed = await callAI(
    'Gemini',
    () => gemini.generateContent({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: AI_TEMPERATURE_JUDGE,
      },
    }),
    (res) => res.response.text(),
  );

  return { ai_model: 'gemini-2.5-flash', ...parsed };
}
