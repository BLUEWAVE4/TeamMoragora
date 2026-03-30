import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://teammoragora.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
});

// ===== 토큰 in-memory 캐싱 (AuthContext에서 단일 관리) =====
let _cachedToken = null;

// AuthContext에서 호출 — onAuthStateChange 구독을 한 곳에서 관리
export function setAuthToken(token) {
  _cachedToken = token;
}

api.interceptors.request.use(async (config) => {
  // 캐시 hit → 즉시 사용, 캐시 miss → getSession fallback (초기 로드 시)
  let token = _cachedToken;
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || null;
    if (token) _cachedToken = token;
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 시 토큰 갱신 후 1회 재시도
let _isRefreshing = false;
let _refreshQueue = [];

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // 이미 갱신 중이면 큐에 대기
      if (_isRefreshing) {
        return new Promise((resolve, reject) => {
          _refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      _isRefreshing = true;
      try {
        const { data: { session }, error } = await supabase.auth.refreshSession();
        const newToken = session?.access_token || null;
        setAuthToken(newToken);

        // 대기 중인 요청들에 새 토큰 전달
        _refreshQueue.forEach(({ resolve }) => resolve(newToken));
        _refreshQueue = [];

        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch {
        _refreshQueue.forEach(({ reject }) => reject(err));
        _refreshQueue = [];
      } finally {
        _isRefreshing = false;
      }
    }

    const message = err.response?.data?.error || err.message;
    return Promise.reject(new Error(message));
  }
);

// 실시간 로비: waiting/chatting 상태의 chat 논쟁 전체 조회
export const getAllPublicDebates = () => api.get('/debates', { params: { status: 'lobby' } });

export const getSocraticFeedback = (data) => api.post('/ai/socratic-feedback', data);
export const getRubricScore = (data) => api.post('/ai/rubric-score', data);

// ===== 논쟁 (Debates) =====
export const createDebate = (data) => api.post('/debates', data);
export const getDebate = (id) => api.get(`/debates/${id}`);
export const getDebateByInviteCode = (inviteCode) => api.get(`/debates/invite/${inviteCode}`);
export const joinByInvite = (inviteCode) => api.post(`/debates/join/${inviteCode}`);
export const getMyActiveDebates = (cursor) => api.get('/debates/my/active', { params: { limit: 100, ...(cursor ? { cursor } : {}) } });
export const deleteDebate = (debateId) => api.delete(`/debates/${debateId}`);
export const incrementDebateView = (debateId) => api.post(`/debates/${debateId}/view`);

// ===== AI =====
export const generateDebateSides = (data) => api.post('/ai/generate-sides', data);

// ===== 주장 (Arguments) =====
export const submitArgument = (debateId, data) => api.post(`/arguments/${debateId}`, data);
export const getArguments = (debateId) => api.get(`/arguments/${debateId}`);
export const generateSoloArgument = (debateId) => api.post(`/arguments/${debateId}/solo`);

// ===== 채팅 (Chat) =====
export const getChatMessages = (debateId) => api.get(`/chat/${debateId}/messages`);
export const endChat = (debateId) => api.post(`/chat/${debateId}/end`);
export const castCitizenVote = (debateId, voted_side) => api.post(`/chat/${debateId}/citizen-vote`, { voted_side });
export const getCitizenVoteTally = (debateId) => api.get(`/chat/${debateId}/citizen-vote`);

// ===== 판결 (Judgments) =====
export const getVerdict = (debateId) => api.get(`/judgments/${debateId}`);
export const getVerdictFeed = (page = 1, limit = 5, category, q) => api.get(`/judgments/feed`, { params: { page, limit, ...(category ? { category } : {}), ...(q ? { q } : {}) } });
export const getDailyVerdicts = (limit = 5) => api.get(`/judgments/daily?limit=${limit}`);
export const getHallOfFame = (limit = 10, q) => api.get('/judgments/hall', { params: { limit, ...(q ? { q } : {}) } });

// ===== 투표 (Votes) =====
export const castVote = (debateId, voted_side) => api.post(`/votes/${debateId}`, { voted_side });
export const getVoteTally = (debateId) => api.get(`/votes/${debateId}`);
export const getMyVote = (debateId) => api.get(`/votes/${debateId}/my`);
export const getMyVotesBatch = (debateIds) => api.post('/votes/batch/my', { debateIds });
export const cancelVote = (debateId) => api.delete(`/votes/${debateId}`);

// ===== 댓글 (Comments) =====
export const getComments = (debateId) => api.get(`/comments/${debateId}`);
export const createComment = (debateId, content) => api.post(`/comments/${debateId}`, { content });
export const deleteComment = (commentId) => api.delete(`/comments/${commentId}`);
export const toggleCommentLike = (commentId) => api.post(`/comments/${commentId}/like`);

export const toggleDebateLike = (id) => api.post(`/debates/${id}/like`);
export const getMyLikesBatch = (debateIds) => api.post('/debates/batch/likes', { debateIds });

// ===== 프로필 (Profiles) =====
export const getMyProfile = () => api.get('/profiles/me');
export const updateMyProfile = (data) => api.patch('/profiles/me', data);
export const completeOnboarding = () => api.patch('/profiles/me/onboarding');
export const getMyDebates = () => api.get('/profiles/me/debates');
export const getMyAnalysis = () => api.get('/profiles/me/analysis');
export const getProfileById = (userId) => api.get(`/profiles/${userId}`);

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

// ===== 애널리틱스 =====
export const trackPageViewApi = (data) => api.post('/analytics/page-view', data).catch(() => {});
export const trackEventApi = (data) => api.post('/analytics/event', data).catch(() => {});

export default api;
