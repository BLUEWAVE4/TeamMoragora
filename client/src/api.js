import axios from 'axios';

// 팀원의 서버 주소 (localhost:5000) 설정
const api = axios.create({
  baseURL: import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://teammoragora.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // 💡 중요: 이 설정이 있어야 서버가 준민님의 로그인 쿠키를 인식합니다.
  withCredentials: true, 
});

/** * 판결 및 투표 관련 API 
 */
export const getVerdictFeed = () => api.get('/judgments/feed');
export const castVote = (debateId, voted_side) => api.post(`/votes/${debateId}`, { voted_side });
export const getVoteTally = (debateId) => api.get(`/votes/${debateId}`);

/** * 마이페이지용 API (팀원 API 명세 반영)
 */
// 내 프로필 정보 가져오기 (GET /api/auth/me)
export const getMyProfile = () => api.get('/auth/me');

// 내가 참여한 판결 기록 목록 가져오기 (GET /api/profiles/me/verdicts)
export const getMyVerdicts = () => api.get('/profiles/me/verdicts');

export const getDebateByInviteCode = (inviteCode) => {
  return axios.get(`/api/debates/invite/${inviteCode}`); 
};

export default api;