import { gemini } from '../config/ai.js';
import { buildContentFilterPrompt, buildGatekeeperPrompt } from './ai/prompts.js';

// ===== Stage 1: 비속어 사전 필터 =====
const PROFANITY_DICT = [
  '시발', '씨발', '쉬발', '쉬밟', '씨빨', '씨팔', '시ㅂ', 'ㅅㅂ',
  '병신', 'ㅂㅅ', '병ㅅ', 'ㅂ신',
  '지랄', 'ㅈㄹ', '지ㄹ', 'ㅈ랄',
  '개새끼', '개세끼', '개섀끼',
  '닥쳐', '꺼져', '미친놈', '미친년', '씹', '좆', '엿먹',
];

// /g 플래그 제거 → test() 호출 시 lastIndex 버그 방지
const PERSONAL_INFO_REGEX = /(\d{3}[-\s]?\d{4}[-\s]?\d{4})|(\d{6}[-\s]?\d{7})|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

export function filterByDictionary(content) {
  const lower = content.toLowerCase();

  for (const word of PROFANITY_DICT) {
    if (lower.includes(word)) {
      return { blocked: true, reason: `금지어 포함: ${word}` };
    }
  }

  if (PERSONAL_INFO_REGEX.test(content)) {
    return { blocked: true, reason: '개인정보(전화번호/주민번호/이메일) 포함' };
  }

  return { blocked: false };
}

// ===== Stage 2: AI 콘텐츠 필터 (Gemini Flash) =====
export async function filterByAI(content) {
  try {
    const prompt = buildContentFilterPrompt(content);
    const result = await gemini.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });
    return JSON.parse(result.response.text());
  } catch {
    // AI 필터 실패 시 통과 처리 (가용성 우선)
    return { action: 'pass', reason: 'AI filter unavailable' };
  }
}

// ===== Stage 3: AI 게이트키퍼 (주제 적합성) =====
export async function filterByGatekeeper(content, topic) {
  try {
    const prompt = buildGatekeeperPrompt(content, topic);
    const result = await gemini.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });
    return JSON.parse(result.response.text());
  } catch {
    return { action: 'pass', reason: 'Gatekeeper unavailable' };
  }
}
