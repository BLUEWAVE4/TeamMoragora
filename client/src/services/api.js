import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach Supabase JWT
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Response interceptor: normalize errors
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message;
    return Promise.reject(new Error(message));
  }
);

// -------------------------------------------------
// frontA

// ===== 논쟁 (Debates) =====
// 논쟁 생성
export const createDebate = (data) => api.post('/debates', data);
// data: { topic, category, purpose, lens }
// 논쟁 단건 조회
export const getDebate = (id) => api.get(`/debates/${id}`);

// ===== 판결 (Judgments) =====
// 판결 상세 조회
export const getVerdict = (debateId) => api.get(`/judgments/${debateId}`);
// 판결 피드 목록
export const getVerdictFeed = () => api.get('/judgments/feed');

// -------------------------------------------------



export default api;
