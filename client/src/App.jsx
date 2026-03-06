import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import DebateCreatePage from './pages/debate/DebateCreatePage';
import DebateDetailPage from './pages/debate/DebateDetailPage';
import InvitePage from './pages/debate/InvitePage';
import ArgumentPage from './pages/debate/ArgumentPage';
import MoragoraDetailPage from './pages/moragora/MoragoraDetailPage';
import MoragoraFeedPage from './pages/moragora/MoragoraFeedPage';
import VotePage from './pages/vote/VotePage';
import ProfilePage from './pages/profile/ProfilePage';
import RankingPage from './pages/ranking/RankingPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import NicknamePage from './pages/auth/NicknamePage';
import JudgingPage from './pages/debate/JudgingPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/:inviteCode" element={<InvitePage />} />
        <Route path="/moragora" element={<MoragoraFeedPage />} />
        <Route path="/moragora/:debateId" element={<MoragoraDetailPage />} />
        <Route path="/ranking" element={<RankingPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/auth/nickname" element={<NicknamePage />} />
          <Route path="/debate/create" element={<DebateCreatePage />} />
          <Route path="/debate/:debateId" element={<DebateDetailPage />} />
          <Route path="/debate/:debateId/argument" element={<ArgumentPage />} />
          <Route path="/debate/:debateId/judging" element={<JudgingPage />} />
          <Route path="/debate/:debateId/vote" element={<VotePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
