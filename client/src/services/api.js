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

// 기존: { params: { sort: '-created_at', limit: 100 } }
// 수정: limit을 500 정도로 넉넉하게 잡습니다.
export const getAllPublicDebates = async () => {
  const baseURL = import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://teammoragora.onrender.com/api';
  
  const response = await axios.get(`${baseURL}/debates`, { 
    params: { 
      sort: '-created_at', 
      limit: 500 // 👈 5개나 20개 제한을 풀기 위해 숫자를 크게 높입니다.
    } 
  });
  
  return response.data;
};

// ===== 논쟁 (Debates) =====
export const createDebate = (data) => api.post('/debates', data);
export const getDebate = (id) => api.get(`/debates/${id}`);
export const getDebateByInviteCode = (inviteCode) => api.get(`/debates/invite/${inviteCode}`);
export const joinByInvite = (inviteCode) => api.post(`/debates/join/${inviteCode}`);
export const acceptInvitation = joinByInvite;
export const getMyActiveDebates = (cursor) => api.get('/debates/my/active', { params: { limit: 1000, ...(cursor ? { cursor } : {}) } });
export const deleteDebate = (debateId) => api.delete(`/debates/${debateId}`);
export const incrementDebateView = (debateId) => api.post(`/debates/${debateId}/view`);

export const getChatRooms = () => api.get('/debates', { params: { sort: '-created_at', limit: 1000 } });

// ===== AI 분석 =====
export const analyzeTopic = (data) => api.post('/ai/analyze-topic', data);

// ===== AI =====
export const generateDebateSides = (data) => api.post('/ai/generate-sides', data);

// ===== 주장 (Arguments) =====
export const submitArgument = (debateId, data) => api.post(`/arguments/${debateId}`, data);
export const getArguments = (debateId) => api.get(`/arguments/${debateId}`);
export const generateSoloArgument = (debateId) => api.post(`/arguments/${debateId}/solo`);

// ===== 채팅 (Chat) =====
export const getChatMessages = (debateId) => api.get(`/chat/${debateId}/messages`);
export const sendChatMessage = (debateId, content) => api.post(`/chat/${debateId}/messages`, { content });
export const startChat = (debateId) => api.post(`/chat/${debateId}/start`);
export const endChat = (debateId) => api.post(`/chat/${debateId}/end`);

// ===== 판결 (Judgments) =====
export const getVerdict = (debateId) => api.get(`/judgments/${debateId}`);
export const getVerdictFeed = (page = 1, limit = 5, category, q) => api.get(`/judgments/feed`, { params: { page, limit, ...(category ? { category } : {}), ...(q ? { q } : {}) } });
export const getDailyVerdicts = (limit = 5) => api.get(`/judgments/daily?limit=${limit}`);
export const getHallOfFame = (limit = 10, q) => api.get('/judgments/hall', { params: { limit, ...(q ? { q } : {}) } });

// ===== 투표 (Votes) =====
export const castVote = (debateId, voted_side) => api.post(`/votes/${debateId}`, { voted_side });
export const getVoteTally = (debateId) => api.get(`/votes/${debateId}`);
export const getMyVote = (debateId) => api.get(`/votes/${debateId}/my`);
export const cancelVote = (debateId) => api.delete(`/votes/${debateId}`);

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

// ===== 알림 =====
export const getNotifications = () => api.get('/notifications');
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);
export const deleteAllNotifications = () => api.delete('/notifications');

// 어드민 대시보드
export const getAdminStats = () => api.get('/admin/stats');
export const getAdminAI = () => api.get('/admin/ai');
export const getAdminTrends = () => api.get('/admin/trends');
export const getAdminAnalytics = () => api.get('/admin/analytics');

export default api;
