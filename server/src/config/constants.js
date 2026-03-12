// ===== 서버 전역 상수 =====

// AI 호출
export const AI_TIMEOUT_MS = 30000;
export const AI_RETRY_DELAY_MS = 15000;
export const AI_TEMPERATURE_JUDGE = 0.3;
export const AI_TEMPERATURE_SOLO = 0.7;
export const AI_MAX_TOKENS_CLAUDE = 1024;

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
export const CATEGORY_STAGE1_ONLY = ['daily', 'romance', '일상', '연애'];
export const CATEGORY_STAGE1_2 = ['work', 'education', '직장', '교육'];
export const CATEGORY_ALL_STAGES = ['social', 'politics', '사회', '정치'];
