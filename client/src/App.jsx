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

// frontA 개인 작업
import DebateCreatePage from "./pages/debate/DebateCreatePage";

function App() {
  return <DebateCreatePage />;
}

export default App;


// 공통 컴포넌트 테스트
// import React, { useState } from 'react';
// import Button from "./components/common/Button";
// import Card from "./components/common/Card";
// import Input from "./components/common/Input";
// import Modal from "./components/common/Modal";
// import StepWizard from "./components/common/StepWizard";
// import Tab from "./components/common/Tab";

// function App() {
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   const [title, setTitle] = useState("");
//   const [content, setContent] = useState("");

//   const [step, setStep] = useState(1);

//   const nextStep = () => setStep((prev) => Math.min(prev + 1, 3));
//   const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

//   return (
//     // 공통 버튼
//     <div className="min-h-screen bg-bg p-10 flex flex-col gap-8">
      
//       <div className="flex flex-wrap gap-4">
//         <Button variant="primary">Button</Button>
//         <Button variant="outline">Button</Button>
//         <Button variant="accent">Button</Button>
//         <Button variant="gold">Button</Button>
//       </div>

//       {/* 공통 카드 */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        
//         <Card 
//           variant="base" 
//           title="The Foundation" 
//           subtitle="Philosophy"
//         >
//           아고라의 중심에서 철학자들이 정의를 논합니다. 가장 기본적인 대리석 질감의 카드입니다.
//         </Card>

//         <Card 
//           variant="noble" 
//           title="Royal Decree" 
//           subtitle="Authority"
//         >
//           중요한 공지나 황금빛 영광이 필요한 순간을 위한 디자인입니다. 깊은 남색과 금색이 조화를 이룹니다.
//         </Card>

//         <Card 
//           variant="clean" 
//           title="White Marble" 
//           subtitle="Purity"
//         >
//           밝고 깨끗한 아테네의 햇살을 머금은 대리석 조각상처럼 부드러운 느낌을 전달합니다.
//         </Card>

//         <Card 
//           variant="judge" 
//           title="The Verdict" 
//           subtitle="Justice"
//         >
//           뜨거운 토론 끝에 내려지는 결단력을 상징합니다. 붉은색 포인트가 시선을 사로잡습니다.
//         </Card>
//       </div>
      
//       <Input 
//           label="Decree Title" 
//           placeholder="주제를 입력하십시오..." 
//           value={title}
//           onChange={(e) => setTitle(e.target.value)}
//         />

//         {/* 2. 내용 입력창 (multiline 적용) */}
//         <Input 
//           label="Arguments & Wisdom" 
//           placeholder="논쟁의 내용을 상세히 기록하십시오 (최대 500자)..." 
//           multiline={true}
//           value={content}
//           onChange={(e) => setContent(e.target.value)}
//         />

//       <Button variant="primary" onClick={() => setIsModalOpen(true)} className="w-full">
//         모달 보기
//       </Button>
//       {/* 모달 컴포넌트 */}
//       <Modal 
//         isOpen={isModalOpen} 
//         onClose={() => setIsModalOpen(false)} 
//         title="모달창"
//       >
//         <p className="mb-4 text-lg">안녕하세요, <span className="text-gold font-bold">{name || "서우주님"}</span>.</p>
//         <p>
//           moragora는 당신의 논쟁을 검토할 준비가 완료 되었습니다. 
//           잠시 후, 번복할 수 없는 논쟁이 시작됩니다. 
//           계속하시겠습니까?
//         </p>
//       </Modal>

//       {/* 푸터 장식 */}
//       <footer className="mt-32 text-center opacity-40">
//         <p className="text-xs tracking-[0.8em] text-primary">🏛️ ATHENS ARCHIVE 🏛️</p>
//       </footer>

//       <div className="min-h-screen bg-bg p-8 md:p-16 font-serif text-primary">
//       <header className="mb-16 text-center">
//         <h1 className="text-4xl font-bold tracking-tighter uppercase mb-4">3단계 위자드</h1>
//         <div className="h-1 w-20 bg-gold mx-auto" />
//       </header>

//       <div className="max-w-2xl mx-auto space-y-16">
//         {/* StepWizard 배치 */}
//         <StepWizard currentStep={step} />

//         {/* 단계별 콘텐츠 카드 */}
//         <Card 
//           variant={step === 3 ? "noble" : "base"} 
//           title={step === 1 ? "Phase 1: 논쟁 목적" : step === 2 ? "Phase 2: 판결 렌즈" : "Phase 3: 주제 입력"}
//           subtitle={`Step ${step} of 3`}
//         >
//           {step === 1 && "논쟁 목적을 선택해주세요."}
//           {step === 2 && "판결 렌즈를 선택해주세요."}
//           {step === 3 && "논쟁 주제를 선택해주세요."}
//         </Card>

//         {/* 제어 버튼 */}
//         <div className="flex justify-between items-center pt-8 border-t border-gold/20">
//           <Button 
//             variant="outline" 
//             onClick={prevStep} 
//             className={step === 1 ? "invisible" : ""}
//           >
//             Previous
//           </Button>
          
//           <Button 
//             variant={step === 3 ? "gold" : "primary"} 
//             onClick={nextStep}
//           >
//             {step === 3 ? "Complete Journey" : "Next Phase"}
//           </Button>
//         </div>
//       </div>
//     </div>

//       <Tab />
//     </div>
//   );
// }

// export default App;

