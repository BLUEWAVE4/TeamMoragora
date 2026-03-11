import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://teammoragora.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message;
    return Promise.reject(new Error(message));
  }
);

// ===== 개별 Export 함수들 (다른 파일에서 import 하여 사용) =====
export const createDebate = (data) => api.post('/debates', data);
export const getDebate = (id) => api.get(`/debates/${id}`);
export const getDebateByInviteCode = (inviteCode) => api.get(`/debates/invite/${inviteCode}`);
export const joinByInvite = (inviteCode) => api.post(`/debates/join/${inviteCode}`);
export const acceptInvitation = joinByInvite;
export const submitArgument = (debateId, data) => api.post(`/arguments/${debateId}`, data);
export const getVerdict = (debateId) => api.get(`/judgments/${debateId}`);

// 무한 스크롤을 위한 page, limit 매개변수 적용
export const getVerdictFeed = (page = 1, limit = 5) => 
  api.get(`/judgments/feed?page=${page}&limit=${limit}`);

export const castVote = (debateId, voted_side) => api.post(`/votes/${debateId}`, { voted_side });
export const getVoteTally = (debateId) => api.get(`/votes/${debateId}`);
export const getMyProfile = () => api.get('/auth/me');
export const getMyVerdicts = () => api.get('/profiles/me/verdicts');
export const submitFeedback = (data) => api.post('/feedbacks', data);
export const getMyFeedbacks = () => api.get('/feedbacks/me');

export default api;