// ===== 서버 전역 상수 =====

// AI 호출
export const AI_TIMEOUT_MS = 30000;
export const AI_RETRY_DELAY_MS = 15000;
export const AI_TEMPERATURE_JUDGE = 0.3;
export const AI_TEMPERATURE_SOLO = 0.7;
export const AI_MAX_TOKENS_CLAUDE = 2048;

// 판결 가중치
export const VERDICT_AI_WEIGHT = 0.75;
export const VERDICT_CITIZEN_WEIGHT = 0.25;
export const CITIZEN_VOTE_THRESHOLD = 30;

// 글자수 제한
export const ARGUMENT_MIN_LENGTH = 50;
export const ARGUMENT_MAX_LENGTH = 2000;
export const VERDICT_TEXT_MAX_LENGTH = 2000;

// 유사도 임계값
export const SIMILARITY_THRESHOLD = 0.85;

// 투표 기본 시간 (시간 단위)
export const DEFAULT_VOTE_DURATION_HOURS = 24;

// 점수 범위
export const SCORE_DETAIL_MIN = 0;
export const SCORE_DETAIL_MAX = 20;
export const CONFIDENCE_MIN = 0.50;
export const CONFIDENCE_MAX = 1.00;
export const CONFIDENCE_DEFAULT = 0.65;

// 카테고리 그룹 (콘텐츠 필터 단계 결정용)
// Stage 1만: 가벼운 주제 (비속어 사전 필터만)
export const CATEGORY_STAGE1_ONLY = ['daily', 'romance', '일상', '연애', '기타'];
// Stage 1~2: 전문적 주제 (비속어 + AI 콘텐츠 필터)
export const CATEGORY_STAGE1_2 = ['work', 'education', '직장', '교육', '기술', '문화'];
// Stage 1~3: 민감한 주제 (비속어 + AI 콘텐츠 + 주제 적합성)
export const CATEGORY_ALL_STAGES = ['social', 'politics', '사회', '정치', '철학'];
