import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/layout/Layout';
import { trackPageView } from './services/analytics';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import DebateCreatePage from './pages/debate/DebateCreatePage';
import DebateDetailPage from './pages/debate/DebateDetailPage'; // 상세 페이지
import InvitePage from './pages/debate/InvitePage';
import ArgumentPage from './pages/debate/ArgumentPage';
import MoragoraDetailPage from './pages/moragora/MoragoraDetailPage';
import MoragoraFeedPage from './pages/moragora/MoragoraFeedPage';
import VotePage from './pages/vote/VotePage';
import ProfilePage from './pages/ProfilePage';
import RankingPage from './pages/ranking/RankingPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import NicknamePage from './pages/auth/NicknamePage';
import JudgingPage from './pages/debate/JudgingPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';


export default function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public - 누구나 접근 가능 */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* 카카오 전용 랜딩 페이지 경로 추가 */}
        <Route path="/login/kakao" element={<LoginPage isKakaoOnly={true} />} />
        <Route path="/invite/:inviteCode" element={<InvitePage />} />
        <Route path="/moragora" element={<RankingPage />} />
        <Route path="/moragora/:debateId" element={<MoragoraDetailPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        
        {/* 🔥 테스트를 위해 상세 페이지를 Public으로 이동함 */}
        <Route path="/debate/:debateId" element={<DebateDetailPage />} />

        {/* Protected - 로그인 필요 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/auth/nickname" element={<NicknamePage />} />
          <Route path="/debate/create" element={<DebateCreatePage />} />
          <Route path="/debate/:debateId/argument" element={<ArgumentPage />} />
          <Route path="/debate/:debateId/judging" element={<JudgingPage />} />
          <Route path="/debate/:debateId/vote" element={<VotePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}