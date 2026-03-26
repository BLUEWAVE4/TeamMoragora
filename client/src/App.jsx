import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import Layout from './components/layout/Layout';
import { trackPageView } from './services/analytics';
import ErrorBoundary from './components/common/ErrorBoundary';

// 초기 번들에 포함 (핵심 페이지)
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import ProtectedRoute from './components/common/ProtectedRoute';

// Lazy loading (나머지 페이지)
const DebateCreatePage = lazy(() => import('./pages/debate/DebateCreatePage'));
const DebateDetailPage = lazy(() => import('./pages/debate/DebateDetailPage'));
const InvitePage = lazy(() => import('./pages/debate/InvitePage'));
const ArgumentPage = lazy(() => import('./pages/debate/ArgumentPage'));
const MoragoraDetailPage = lazy(() => import('./pages/moragora/MoragoraDetailPage'));
const MoragoraFeedPage = lazy(() => import('./pages/moragora/MoragoraFeedPage'));
const VotePage = lazy(() => import('./pages/vote/VotePage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const RankingPage = lazy(() => import('./pages/ranking/RankingPage'));
const NicknamePage = lazy(() => import('./pages/auth/NicknamePage'));
const JudgingPage = lazy(() => import('./pages/debate/JudgingPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const ChatRoom = lazy(() => import('./pages/debate/ChatRoom'));
const DebateLobbyPage = lazy(() => import('./pages/debate/DebateLobbyPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const ChatLobby = lazy(() => import('./pages/debate/ChatLobby'));
const ChatLobbyList = lazy(() => import('./pages/debate/ChatLobbyList'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F3F1EC]">
      <div className="w-8 h-8 border-4 border-[#1B2A4A] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/kakao" element={<LoginPage isKakaoOnly={true} />} />
            <Route path="/invite/:inviteCode" element={<InvitePage />} />
            <Route path="/moragora" element={<RankingPage />} />
            <Route path="/moragora/:debateId" element={<MoragoraDetailPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/debate/lobby/:inviteCode" element={<DebateLobbyPage />} />
            <Route path="/debate/:debateId" element={<DebateDetailPage />} />
            <Route path="/debate/lobby" element={<DebateLobbyPage />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/auth/nickname" element={<NicknamePage />} />
              <Route path="/debate/create" element={<DebateCreatePage />} />

              <Route path="/debate/:debateId/lobby" element={<ChatLobby />} />
              <Route path="/debate/chat/list" element={<ChatLobbyList />} />

              <Route path="/debate/chat/room" element={<ChatRoom />} />
              <Route path="/debate/:debateId/chat" element={<ChatRoom />} />
              <Route path="/debate/:debateId/argument" element={<ArgumentPage />} />
              <Route path="/debate/:debateId/judging" element={<JudgingPage />} />
              <Route path="/debate/:debateId/vote" element={<VotePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
