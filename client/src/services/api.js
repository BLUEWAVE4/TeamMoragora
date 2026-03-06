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

// [논쟁 관련 API]
// 논쟁 정보 조회
export const getDebate = (id) => api.get(`/debates/${id}`);

// 초대 코드로 논쟁 정보 상세 조회 (InvitePage에서 사용)
export const getDebateByInviteCode = (inviteCode) => api.get(`/debates/invite/${inviteCode}`);

// 초대 코드로 논쟁 참여
export const joinByInvite = (inviteCode) => api.post(`/debates/join/${inviteCode}`);
export const acceptInvitation = joinByInvite;

// [주장 관련 API]
// 주장 제출 (50~2000자)
export const submitArgument = (debateId, data) => api.post(`/arguments/${debateId}`, data);
