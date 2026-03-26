import { openai } from '../config/ai.js';
import { buildContentFilterPrompt, buildGatekeeperPrompt } from './ai/prompts.js';

// ===== Stage 1: 비속어 사전 필터 (정규식 기반) =====

// 특수문자/공백/숫자/점/밑줄 삽입 우회 방어
function stripNoise(text) {
  return text.replace(/[^가-힣a-zA-Zㄱ-ㅎㅏ-ㅣ]/g, '');
}

// 초성 분리: ㅅㅂ, ㅂㅅ 등 초성 조합 방어
function extractChosung(text) {
  const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  return [...text].map(c => {
    const code = c.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return c;
    return CHO[Math.floor(code / 588)];
  }).join('');
}

// ===== 비속어 정규식 패턴 =====
// 각 글자 사이에 특문/공백/숫자가 들어갈 수 있는 패턴 생성
const S = '[\\s\\d\\-_.*~!@#$%^&()=+,.<>?;:\'"\\[\\]{}|/\\\\]*'; // 글자 사이 삽입 가능 문자

const PROFANITY_PATTERNS = [
  // ===== 시발/씨발 계열 =====
  new RegExp(`[시씨쉬슈쓔쒸][${S}]?[발빨팔벌볼불밟][${S}]?[놈년것넘련]?`, 'i'),
  new RegExp(`시${S}?ㅂ|ㅅ${S}?ㅂ|ㅆ${S}?ㅂ`, 'i'),
  new RegExp(`씨${S}?바|쒸${S}?바|씌${S}?바`, 'i'),
  /tlqkf|tlbal|sibal|ssibal|shibal/i, // 영타 변환

  // ===== 병신 계열 =====
  new RegExp(`병${S}?[신싄싞]`),
  new RegExp(`ㅂ${S}?ㅅ|ㅂ${S}?ㄱ${S}?ㅅ`),
  /ㅄ/,
  /byungsin|byeongsin|bsin/i,

  // ===== 지랄 계열 =====
  new RegExp(`지${S}?[랄럴랭]`),
  new RegExp(`ㅈ${S}?ㄹ`),
  /jiral|jilal/i,

  // ===== 개새끼 계열 =====
  new RegExp(`개${S}?[새세섀쉐]${S}?[끼키기]`),
  new RegExp(`개${S}?[쌍썅]${S}?[놈년]?`),
  new RegExp(`개${S}?[좆좃]`),

  // ===== 씹 계열 =====
  new RegExp(`[씹씌쓥][${S}]?[새세]?`),
  /ㅆㅂ/,

  // ===== 좆 계열 =====
  new RegExp(`[좆좃좇][${S}]?[같밥대만]?`),

  // ===== 새끼 (단독) =====
  new RegExp(`[새세섀쉐][${S}]?[끼키기꺄]`),

  // ===== 미친 계열 =====
  new RegExp(`미친${S}?[놈년것넘련새]`),
  new RegExp(`[미]${S}?친${S}?[놈년]`),

  // ===== 닥쳐/꺼져 계열 =====
  new RegExp(`닥${S}?[쳐쳐치]`),
  /ㄷㅊ/,

  // ===== 엿/염병 계열 =====
  new RegExp(`엿${S}?[먹머]`),
  new RegExp(`염${S}?병`),

  // ===== 느금마 계열 =====
  new RegExp(`느${S}?[금그]${S}?[마빠]`),
  /니미|니엄|느금/,

  // ===== 한남/한녀 혐오 =====
  /한남충|한녀충|김치녀|된장녀|맘충/,

  // ===== 장애 비하 =====
  new RegExp(`[장]${S}?[애에]${S}?[인]`),
  /등신|저능아|정신병자|또라이/,

  // ===== 성적 비하 =====
  /성[기]노출/,
  /꼴[리릿]|흥[분]제/,

  // ===== 인종/외국인 비하 =====
  /깜[둥]이|쪽[바]리|짱[깨게]|되[놈년]/,

  // ===== 자해/위협 =====
  new RegExp(`[죽주]${S}?[여이을어]${S}?[라버]`),
  /자살해/,

  // ===== 영어 비속어 =====
  /f+u+c+k+|s+h+i+t+|b+i+t+c+h+|d+a+m+n+|a+s+s+h+o+l+e+/i,
  /wtf|stfu/i,
];

// 초성 조합 패턴 (노이즈 제거 후 초성 검사)
const CHOSUNG_PATTERNS = [
  /ㅅㅂ/, /ㅂㅅ/, /ㅈㄹ/, /ㅄ/, /ㄷㅊ/, /ㅆㅂ/, /ㅁㅊ/,
];

// 오탐 방지 허용 목록
const FALSE_POSITIVE_WORDS = [
  '시발점', '시발역', '시발지', '지랄도', '꺼져있', '꺼져서', '꺼져야',
  '병신론', '미친듯이', '미친바람', '씨발아시아', '새끼줄', '새끼손',
  '등신불', '등신대', '장애인권', '장애인복지',
];

const PERSONAL_INFO_REGEX = /(\d{3}[-\s]?\d{4}[-\s]?\d{4})|(\d{6}[-\s]?\d{7})|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

export function filterByDictionary(content) {
  const lower = content.toLowerCase();
  const stripped = stripNoise(lower);
  const chosung = extractChosung(stripped);

  // 허용 목록 체크
  const hasFalsePositive = FALSE_POSITIVE_WORDS.some(fp => lower.includes(fp));

  if (!hasFalsePositive) {
    // 정규식 패턴 매칭 (원본 + 노이즈 제거본)
    for (const pattern of PROFANITY_PATTERNS) {
      if (pattern.test(lower) || pattern.test(stripped)) {
        return { blocked: true, reason: '부적절한 표현이 감지되었습니다.' };
      }
    }

    // 초성 패턴 매칭
    for (const pattern of CHOSUNG_PATTERNS) {
      if (pattern.test(chosung)) {
        return { blocked: true, reason: '부적절한 표현이 감지되었습니다.' };
      }
    }
  }

  // 개인정보 검사
  if (PERSONAL_INFO_REGEX.test(content)) {
    return { blocked: true, reason: '개인정보(전화번호/주민번호/이메일) 포함' };
  }

  return { blocked: false };
}

// ===== Stage 2: AI 콘텐츠 필터 (GPT-4o) =====
export async function filterByAI(content) {
  try {
    const prompt = buildContentFilterPrompt(content);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });
    return JSON.parse(response.choices[0].message.content);
  } catch {
    // AI 필터 실패 시 통과 처리 (가용성 우선)
    return { action: 'pass', reason: 'AI filter unavailable' };
  }
}

// ===== Stage 3: AI 게이트키퍼 (주제 적합성, GPT-4o) =====
export async function filterByGatekeeper(content, topic) {
  try {
    const prompt = buildGatekeeperPrompt(content, topic);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return { action: 'pass', reason: 'Gatekeeper unavailable' };
  }
}
