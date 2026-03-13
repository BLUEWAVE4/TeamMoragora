// ===== AI 공통 래퍼 =====
// 타임아웃, JSON 파싱, 에러 처리를 한 곳에서 관리

import { AI_TIMEOUT_MS } from '../../config/constants.js';
import { AIServiceError } from '../../errors/index.js';

/**
 * AI API 호출 + 타임아웃 + JSON 파싱 공통 래퍼
 * @param {string} modelName - 모델 이름 (로그용)
 * @param {() => Promise} apiFn - 실제 API 호출 함수
 * @param {(response) => string} extractText - 응답에서 텍스트 추출 함수
 * @returns {Promise<object>} 파싱된 JSON 객체
 */
export async function callAI(modelName, apiFn, extractText) {
  const response = await Promise.race([
    apiFn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new AIServiceError(modelName, `응답 타임아웃 (${AI_TIMEOUT_MS / 1000}초)`)), AI_TIMEOUT_MS)
    ),
  ]);

  const raw = extractText(response);
  return parseJSON(modelName, raw);
}

/**
 * JSON 파싱 (직접 파싱 → regex 폴백)
 */
function parseJSON(modelName, text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new AIServiceError(modelName, '응답에서 JSON을 찾을 수 없습니다.');
    return JSON.parse(match[0]);
  }
}
