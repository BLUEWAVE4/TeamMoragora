// ===== 환경변수 중앙 관리 =====
// 앱 시작 시 필수 환경변수 검증 + 타입 변환
import 'dotenv/config';

function required(key) {
  const val = process.env[key];
  if (!val) {
    console.error(`[ENV] 필수 환경변수 누락: ${key}`);
    process.exit(1);
  }
  return val;
}

function optional(key, fallback) {
  return process.env[key] || fallback;
}

export const env = {
  // Supabase
  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
  SUPABASE_ANON_KEY: required('SUPABASE_ANON_KEY'),

  // AI API Keys
  OPENAI_API_KEY: required('OPENAI_API_KEY'),
  GOOGLE_AI_API_KEY: required('GOOGLE_AI_API_KEY'),
  ANTHROPIC_API_KEY: required('ANTHROPIC_API_KEY'),
  GROK_API_KEY: optional('GROK_API_KEY', ''),

  // Server
  PORT: parseInt(optional('PORT', '5000'), 10),
  CLIENT_URL: optional('CLIENT_URL', 'http://localhost:5173'),
  VOTE_DURATION_HOURS: parseInt(optional('VOTE_DURATION_HOURS', '24'), 10),
  CRON_SECRET: optional('CRON_SECRET', ''),
};
