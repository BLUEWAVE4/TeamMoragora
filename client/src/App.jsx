// import { Routes, Route } from 'react-router-dom';
// import Layout from './components/layout/Layout';
// import HomePage from './pages/HomePage';
// import LoginPage from './pages/auth/LoginPage';
// import SignupPage from './pages/auth/SignupPage';
// import DebateCreatePage from './pages/debate/DebateCreatePage';
// import DebateDetailPage from './pages/debate/DebateDetailPage';
// import InvitePage from './pages/debate/InvitePage';
// import ArgumentPage from './pages/debate/ArgumentPage';
// import MoragoraDetailPage from './pages/moragora/MoragoraDetailPage';
// import MoragoraFeedPage from './pages/moragora/MoragoraFeedPage';
// import VotePage from './pages/vote/VotePage';
// import ProfilePage from './pages/profile/ProfilePage';
// import RankingPage from './pages/ranking/RankingPage';
// import ProtectedRoute from './components/common/ProtectedRoute';

// export default function App() {
//   return (
//     <Routes>
//       <Route element={<Layout />}>
//         {/* Public */}
//         <Route path="/" element={<HomePage />} />
//         <Route path="/login" element={<LoginPage />} />
//         <Route path="/signup" element={<SignupPage />} />
//         <Route path="/invite/:inviteCode" element={<InvitePage />} />
//         <Route path="/moragora" element={<MoragoraFeedPage />} />
//         <Route path="/moragora/:debateId" element={<MoragoraDetailPage />} />
//         <Route path="/ranking" element={<RankingPage />} />

//         {/* Protected */}
//         <Route element={<ProtectedRoute />}>
//           <Route path="/debate/create" element={<DebateCreatePage />} />
//           <Route path="/debate/:debateId" element={<DebateDetailPage />} />
//           <Route path="/debate/:debateId/argument" element={<ArgumentPage />} />
//           <Route path="/debate/:debateId/vote" element={<VotePage />} />
//           <Route path="/profile" element={<ProfilePage />} />
//         </Route>
//       </Route>
//     </Routes>
//   );
// }


import NewDebate from "./pages/debate/NewDebate";

function App() {
  return <NewDebate />;
}

export default App;

// import NewDebate from "./pages/debate/NewDebate";
// import Router from "./router/Router";

// function App() {
//   return 
//   <>
//   <NewDebate />
//   <Router />
//   </>
//   ;
// }

// export default App;



// Tailwind 테스트용

// function App() {
//   return (
//     <div className="min-h-screen bg-primary-500 flex items-center justify-center">
//       <h1 className="text-4xl font-bold text-white">
//         TEST
//       </h1>
//     </div>
//   )
// }

// export default App