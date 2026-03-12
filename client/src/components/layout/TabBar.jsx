import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import DoorTransition from './DoorTransition';

// --- 아이콘 컴포넌트 세트 ---

// 1. 홈 아이콘: 활성화 시 선 굵기 강조
const HomeIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.8" : "2"} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

// 2. 리그(트로피) 아이콘
const TrophyIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.8" : "2"} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);

// 3. 중앙 + 버튼: ★핵심 수정 사항 (배경 채움 + 선 색상 반전)
const PlusIcon = ({ active }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
    {/* 외곽 프레임 */}
    <rect width="18" height="18" x="3" y="3" rx="5" ry="5"/>
    {/* active일 때 선 색상을 stroke-white(흰색)로 변경하여 반전 효과 부여 */}
    <g stroke={active ? "white" : "currentColor"}>
      <line x1="12" x2="12" y1="8" y2="16"/>
      <line x1="8" x2="16" y1="12" y2="12"/>
    </g>
  </svg>
);

// 4. 전당 아이콘
const HallIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.8" : "2"} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
    <path d="M3 22h18"/><path d="M5 22V11"/><path d="M19 22V11"/><path d="M9 22V11"/><path d="M15 22V11"/><path d="m12 2-9 4v5h18V6l-9-4Z"/>
  </svg>
);

// 5. 마이페이지 아이콘
const UserIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.8" : "2"} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

// --- 메인 탭바 컴포넌트 ---

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDoorOpen, setIsDoorOpen] = useState(false);

  // 현재 경로가 생성 페이지인지 확인하여 상태 유지
  const isCreateActive = location.pathname === '/debate/create';

  const menuItems = [
    { to: '/', icon: (active) => <HomeIcon active={active} /> },
    { to: '/ranking', icon: (active) => <TrophyIcon active={active} /> },
    { isButton: true, icon: (active) => <PlusIcon active={active} /> },
    { to: '/moragora', icon: (active) => <HallIcon active={active} /> },
    { to: '/profile', icon: (active) => <UserIcon active={active} /> }
  ];

  return (
    <>
      {/* 문 애니메이션 레이어 (최상단) */}
      {isDoorOpen && (
        <DoorTransition 
          onAnimationComplete={() => {
            navigate('/debate/create');
            setIsDoorOpen(false);
          }} 
        />
      )}

      {/* 하단 네비게이션 컨테이너 (인스타그램 스타일 바닥 밀착) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center">
        <nav className="w-full max-w-[420px] bg-white/95 backdrop-blur-md border-t border-gray-100 h-[60px] flex items-center justify-around pointer-events-auto pb-[env(safe-area-inset-bottom,0px)]">
          
          {menuItems.map((item, idx) => {
            // 중앙 추가 버튼 (클릭 시 애니메이션 실행)
            if (item.isButton) {
              const activeStatus = isDoorOpen || isCreateActive;
              return (
                <button 
                  key="center-btn"
                  onClick={() => setIsDoorOpen(true)}
                  className={`flex-1 flex justify-center items-center h-full transition-all duration-200 
                    ${activeStatus ? 'text-black scale-110' : 'text-gray-800 active:scale-90'}`}
                >
                  {item.icon(activeStatus)}
                </button>
              );
            }

            // 일반 메뉴 버튼 (NavLink)
            const isActive = location.pathname === item.to;
            return (
              <NavLink 
                key={item.to}
                to={item.to} 
                className="flex-1 flex justify-center items-center h-full"
              >
                <div className={`transition-all duration-200 ${isActive ? 'text-black scale-110' : 'text-gray-400 hover:text-gray-600'}`}>
                  {item.icon(isActive)}
                </div>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </>
  );
}