// 주장 입력 전처리 서비스
// 프롬프트 인젝션 방어 + 텍스트 정규화 + 유효성 검증

import { ARGUMENT_MIN_LENGTH, ARGUMENT_MAX_LENGTH, SIMILARITY_THRESHOLD } from '../config/constants.js';

// ===== 프롬프트 인젝션 패턴 (영문 + 한국어) =====
const INJECTION_PATTERNS = [
  // 영문 패턴
  /system\s*:/gi,
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /you\s+are\s+now/gi,
  /forget\s+(all\s+)?previous/gi,
  /disregard\s+(all\s+)?above/gi,
  /new\s+instructions?\s*:/gi,
  /```system/gi,
  /\[SYSTEM\]/gi,
  /\{system_prompt\}/gi,
  /override\s+prompt/gi,
  /act\s+as\s+(if\s+)?(you\s+are\s+)?a/gi,
  /pretend\s+(you\s+are|to\s+be)/gi,
  /\bdo\s+not\s+judge\b/gi,
  /\boutput\s+the\s+following\b/gi,
  /\brespond\s+with\b/gi,
  // 한국어 패턴
  /이전\s*(지시|명령|지침|프롬프트).*무시/gi,
  /모든\s*(지시|명령|규칙).*무시/gi,
  /(너|당신)는?\s*이제\s*부터/gi,
  /(너|당신)는?\s*.{0,5}(판사|판결자|AI)가?\s*아니/gi,
  /(너|당신)는?\s*.{0,15}(지지자|변호사|대변인)/gi,
  /시스템\s*:?\s*(새로운|변경|수정)/gi,
  /역할\s*을?\s*(변경|바꿔|바꾸)/gi,
  /다음과\s*같이\s*(출력|응답|답변)/gi,
  /(무조건|반드시)\s*(A|B)측?\s*(승리|이기|승)/gi,
  /JSON\s*으?로?\s*(출력|응답|답변)/gi,
  /winner_side/gi,
  /score_[ab]/gi,
];

const MAX_LENGTH = ARGUMENT_MAX_LENGTH;
const MIN_LENGTH = ARGUMENT_MIN_LENGTH;

/**
 * 주장 텍스트 전처리
 * @param {string} rawText - 원본 주장 텍스트
 * @param {string} [otherSideText] - 상대측 주장 (유사도 체크용)
 * @returns {{ text: string, status: string, charCount: number, warnings: string[] }}
 */
export function preprocessArgument(rawText, otherSideText) {
  const warnings = [];
  let text = rawText;

  // 0. 빈 입력 체크
  if (!text || text.trim().length === 0) {
    return { text: '', status: 'empty', charCount: 0, warnings: ['빈 주장'] };
  }

  // 1. 길이 제한 (2,000자)
  if (text.length > MAX_LENGTH) {
    text = text.slice(0, MAX_LENGTH);
    warnings.push('글자 수 초과로 2,000자에서 잘림');
  }

  // 2. 프롬프트 인젝션 시도 차단
  let injectionCount = 0;
  for (const pattern of INJECTION_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      injectionCount += matches.length;
      text = text.replace(pattern, '[필터링됨]');
    }
  }
  if (injectionCount > 0) {
    warnings.push(`프롬프트 인젝션 시도 ${injectionCount}건 필터링됨`);
  }

  // 3. HTML 태그 / 마크다운 코드블록 제거 (판결 출력 오염 방지)
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/```[\s\S]*?```/g, '');

  // 4. 연속 공백/개행 정리
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/ {3,}/g, ' ');
  text = text.trim();

  // 5. 최소 글자 수 체크
  if (text.length < MIN_LENGTH) {
    return { text, status: 'too_short', charCount: text.length, warnings };
  }

  // 5-1. 자기 주장 내 동일 문장 반복 감지
  const repeatResult = detectRepetition(text);
  if (repeatResult.blocked) {
    return {
      text,
      status: 'repetitive',
      charCount: text.length,
      warnings: [...warnings, repeatResult.reason],
    };
  }
  if (repeatResult.warning) {
    warnings.push(repeatResult.warning);
  }

  // 6. 양측 동일 주장 체크 (Jaccard 유사도)
  if (otherSideText) {
    const similarity = calculateTextSimilarity(text, otherSideText);
    if (similarity > SIMILARITY_THRESHOLD) {
      return {
        text,
        status: 'duplicate',
        charCount: text.length,
        warnings: [...warnings, `상대 주장과 유사도 ${(similarity * 100).toFixed(0)}%`],
      };
    }
  }

  return { text, status: 'valid', charCount: text.length, warnings };
}

/**
 * 동일 문장/구절 반복 감지
 * - 문장 단위로 분리 후 중복 비율 계산
 * - 50% 이상 반복이면 차단, 30% 이상이면 경고
 */
function detectRepetition(text) {
  // 문장 단위 분리 (마침표, 느낌표, 물음표, 줄바꿈)
  const sentences = text
    .split(/[.!?\n]+/)
    .map(s => s.trim().replace(/\s+/g, ' '))
    .filter(s => s.length >= 5); // 5자 미만 무시

  if (sentences.length < 2) return { blocked: false };

  // 중복 문장 카운트
  const seen = {};
  let duplicateCount = 0;
  for (const s of sentences) {
    const key = s.toLowerCase();
    if (seen[key]) {
      duplicateCount++;
    } else {
      seen[key] = true;
    }
  }

  const repeatRatio = duplicateCount / sentences.length;

  if (repeatRatio >= 0.5) {
    return { blocked: true, reason: '동일한 내용이 과도하게 반복되었습니다. 다양한 논거를 포함해주세요.' };
  }
  if (repeatRatio >= 0.3) {
    return { blocked: false, warning: `문장 반복 ${Math.round(repeatRatio * 100)}% 감지 — 판결 시 감점될 수 있습니다.` };
  }

  // 연속 동일 구절 감지 (같은 텍스트 3회 이상 연속)
  const words = text.split(/\s+/);
  for (let len = 3; len <= 10; len++) {
    for (let i = 0; i <= words.length - len * 3; i++) {
      const chunk = words.slice(i, i + len).join(' ');
      let count = 0;
      for (let j = i; j <= words.length - len; j += len) {
        if (words.slice(j, j + len).join(' ') === chunk) count++;
        else break;
      }
      if (count >= 3) {
        return { blocked: true, reason: `"${chunk.slice(0, 20)}..." 구절이 ${count}회 연속 반복되었습니다.` };
      }
    }
  }

  return { blocked: false };
}

/**
 * 텍스트 유사도 계산 (Jaccard 기반)
 */
function calculateTextSimilarity(textA, textB) {
  const setA = new Set(textA.split(/\s+/));
  const setB = new Set(textB.split(/\s+/));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}
