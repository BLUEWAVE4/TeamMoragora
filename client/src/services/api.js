import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://teammoragora.onrender.com/api',
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

// ===== 논쟁 (Debates) =====
export const createDebate = (data) => api.post('/debates', data);
export const getDebate = (id) => api.get(`/debates/${id}`);
export const getDebateByInviteCode = (inviteCode) => api.get(`/debates/invite/${inviteCode}`);
export const joinByInvite = (inviteCode) => api.post(`/debates/join/${inviteCode}`);
export const acceptInvitation = joinByInvite;

// ===== AI 분석 =====
export const analyzeTopic = (data) => api.post('/ai/analyze-topic', data);
// ===== AI =====
export const generateDebateSides = (data) =>
  api.post('/ai/generate-sides', data);

// ===== 주장 (Arguments) =====
export const submitArgument = (debateId, data) => api.post(`/arguments/${debateId}`, data);
export const getArguments = (debateId) => api.get(`/arguments/${debateId}`);

// ===== 판결 (Judgments) =====
export const getVerdict = (debateId) => api.get(`/judgments/${debateId}`);
export const getVerdictFeed = (page = 1, limit = 5) => api.get(`/judgments/feed?page=${page}&limit=${limit}`);

// ===== 투표 (Votes) =====
export const castVote = (debateId, voted_side) => api.post(`/votes/${debateId}`, { voted_side });
export const getVoteTally = (debateId) => api.get(`/votes/${debateId}`);
export const cancelVote = (debateId) => api.delete(`/votes/${debateId}`); // 추가


// ===== 댓글 (Comments) =====
export const getComments = (debateId) => api.get(`/comments/${debateId}`);
export const createComment = (debateId, content) => api.post(`/comments/${debateId}`, { content });
export const deleteComment = (commentId) => api.delete(`/comments/${commentId}`);
export const toggleCommentLike = (commentId) => api.post(`/comments/${commentId}/like`);

// ===== 프로필 (Profiles) =====
export const getMyProfile = () => api.get('/auth/me');
export const getMyVerdicts = () => api.get('/profiles/me/verdicts');

// ===== 피드백 (Feedbacks) =====
export const submitFeedback = (data) => api.post('/feedbacks', data);
export const getMyFeedbacks = () => api.get('/feedbacks/me');

export default api;
