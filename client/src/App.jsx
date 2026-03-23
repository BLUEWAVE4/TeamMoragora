// import { Routes, Route, useLocation } from 'react-router-dom';
// import { useEffect } from 'react';
// import Layout from './components/layout/Layout';
// import { trackPageView } from './services/analytics';
// import HomePage from './pages/HomePage';
// import LoginPage from './pages/auth/LoginPage';
// import DebateCreatePage from './pages/debate/DebateCreatePage';
// import DebateDetailPage from './pages/debate/DebateDetailPage'; // 상세 페이지
// import InvitePage from './pages/debate/InvitePage';
// import ArgumentPage from './pages/debate/ArgumentPage';
// import MoragoraDetailPage from './pages/moragora/MoragoraDetailPage';
// import MoragoraFeedPage from './pages/moragora/MoragoraFeedPage';
// import VotePage from './pages/vote/VotePage';
// import ProfilePage from './pages/ProfilePage';
// import RankingPage from './pages/ranking/RankingPage';
// import ProtectedRoute from './components/common/ProtectedRoute';
// import NicknamePage from './pages/auth/NicknamePage';
// import JudgingPage from './pages/debate/JudgingPage';
// import PrivacyPage from './pages/PrivacyPage';
// import TermsPage from './pages/TermsPage';


// export default function App() {
//   const location = useLocation();
//   useEffect(() => {
//     window.scrollTo(0, 0);
//     trackPageView(location.pathname);
//   }, [location.pathname]);

//   return (
//     <Routes>
//       <Route element={<Layout />}>
//         {/* Public - 누구나 접근 가능 */}
//         <Route path="/" element={<HomePage />} />
//         <Route path="/login" element={<LoginPage />} />
//         {/* 카카오 전용 랜딩 페이지 경로 추가 */}
//         <Route path="/login/kakao" element={<LoginPage isKakaoOnly={true} />} />
//         <Route path="/invite/:inviteCode" element={<InvitePage />} />
//         <Route path="/moragora" element={<MoragoraFeedPage />} />
//         <Route path="/moragora/:debateId" element={<MoragoraDetailPage />} />
//         <Route path="/ranking" element={<RankingPage />} />
//         <Route path="/privacy" element={<PrivacyPage />} />
//         <Route path="/terms" element={<TermsPage />} />
        
//         {/* 🔥 테스트를 위해 상세 페이지를 Public으로 이동함 */}
//         <Route path="/debate/:debateId" element={<DebateDetailPage />} />

//         {/* Protected - 로그인 필요 */}
//         <Route element={<ProtectedRoute />}>
//           <Route path="/auth/nickname" element={<NicknamePage />} />
//           <Route path="/debate/create" element={<DebateCreatePage />} />
//           <Route path="/debate/:debateId/argument" element={<ArgumentPage />} />
//           <Route path="/debate/:debateId/judging" element={<JudgingPage />} />
//           <Route path="/debate/:debateId/vote" element={<VotePage />} />
//           <Route path="/profile" element={<ProfilePage />} />
//         </Route>
//       </Route>
//     </Routes>
//   );
// }

import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/layout/Layout';
import { trackPageView } from './services/analytics';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import DebateCreatePage from './pages/debate/DebateCreatePage';
import DebateDetailPage from './pages/debate/DebateDetailPage';
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
import ChatRoom from './pages/debate/ChatRoom'; // ← 추가

export default function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
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
        <Route path="/debate/:debateId" element={<DebateDetailPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/auth/nickname" element={<NicknamePage />} />
          <Route path="/debate/create" element={<DebateCreatePage />} />
          <Route path="/debate/chat/room" element={<ChatRoom />} />          {/* ← 추가: 실시간 논쟁 진입 */}
          <Route path="/debate/:debateId/chat" element={<ChatRoom />} />     {/* ← 추가: debateId 있는 채팅방 */}
          <Route path="/debate/:debateId/argument" element={<ArgumentPage />} />
          <Route path="/debate/:debateId/judging" element={<JudgingPage />} />
          <Route path="/debate/:debateId/vote" element={<VotePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}