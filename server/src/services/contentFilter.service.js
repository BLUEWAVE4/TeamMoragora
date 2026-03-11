import { gemini } from '../config/ai.js';
import { buildContentFilterPrompt, buildGatekeeperPrompt } from './ai/prompts.js';

// ===== Stage 1: 비속어 사전 필터 =====
const PROFANITY_DICT = [
  '시발', '씨발', '쉬발', '쉬밟', '씨빨', '씨팔', '시ㅂ', 'ㅅㅂ',
  '병신', 'ㅂㅅ', '병ㅅ', 'ㅂ신', 'ㅄ',
  '지랄', 'ㅈㄹ', '지ㄹ', 'ㅈ랄',
  '개새끼', '개세끼', '개섀끼',
  '닥쳐', '꺼져', '미친놈', '미친년', '씹', '좆', '엿먹',
];

// 특수문자/공백/숫자 삽입 우회 방어: 한글+영문+ㄱ-ㅎ+ㅏ-ㅣ만 남기고 제거
function stripNoise(text) {
  return text.replace(/[^가-힣a-zA-Zㄱ-ㅎㅏ-ㅣ]/g, '');
}

// "시발점", "지랄도" 등 정상 단어 오탐 방지용 허용 목록
const FALSE_POSITIVE_WORDS = ['시발점', '시발역', '지랄도', '꺼져있', '꺼져서'];

// /g 플래그 제거 → test() 호출 시 lastIndex 버그 방지
const PERSONAL_INFO_REGEX = /(\d{3}[-\s]?\d{4}[-\s]?\d{4})|(\d{6}[-\s]?\d{7})|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

export function filterByDictionary(content) {
  const lower = content.toLowerCase();
  const stripped = stripNoise(lower);

  // 허용 목록에 해당하면 비속어 검사 건너뛰기
  const hasFalsePositive = FALSE_POSITIVE_WORDS.some(fp => lower.includes(fp));

  // 원본 + 노이즈 제거본 모두 검사
  if (!hasFalsePositive) {
    for (const word of PROFANITY_DICT) {
      if (lower.includes(word) || stripped.includes(word)) {
        return { blocked: true, reason: `금지어 포함: ${word}` };
      }
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
