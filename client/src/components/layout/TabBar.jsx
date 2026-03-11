import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import DoorTransition from './DoorTransition';

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const TrophyIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);
const HallIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22h18"/><path d="M5 22V11"/><path d="M19 22V11"/><path d="M9 22V11"/><path d="M15 22V11"/><path d="m12 2-9 4v5h18V6l-9-4Z"/></svg>
);
const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDoorOpen, setIsDoorOpen] = useState(false);

  const menuItems = [
    { to: '/', icon: <HomeIcon />, label: '홈' },
    { to: '/ranking', icon: <TrophyIcon />, label: '리그' },
    { isButton: true },
    { to: '/moragora', icon: <HallIcon />, label: '전당' },
    { to: '/profile', icon: <UserIcon />, label: 'MY' }
  ];

  return (
    <>
      {/* ✨ 문 애니메이션 컴포넌트 (nav 바깥 최상단 레이어) */}
      {isDoorOpen && (
        <DoorTransition 
          onAnimationComplete={() => {
            navigate('/debate/create');
            setIsDoorOpen(false);
          }} 
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 flex justify-center z-50 px-1 pb-[env(safe-area-inset-bottom,16px)] mb-0.5 pointer-events-none">
        <nav className="w-full max-w-[420px] bg-white backdrop-blur-md rounded-[1.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-gray-300 h-[76px] flex items-center justify-around px-2 pointer-events-auto">
          
          {menuItems.map((item, idx) => {
            if (item.isButton) {
              return (
                <button 
                  key="center-btn"
                  onClick={() => setIsDoorOpen(true)}
                  className="w-14 h-14 bg-[#1a1a1a] text-white rounded-4xl flex items-center justify-center shadow-lg active:scale-90 transition-all duration-200 hover:bg-black"
                >
                  <span className="text-3xl font-light">+</span>
                </button>
              );
            }

            const isActive = location.pathname === item.to;

            return (
              <NavLink 
                key={item.to}
                to={item.to} 
                className="flex-1 flex justify-center items-center h-full no-underline"
              >
                <div className={`
                  flex flex-col items-center justify-center w-[64px] h-[58px] rounded-[1.5rem] transition-all duration-400 ease-[cubic-bezier(0.23,1,0.32,1)]
                  ${isActive 
                    ? 'bg-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-yellow-400 scale-105' 
                    : 'bg-transparent border border-transparent text-gray-800'}
                `}>
                  <div className={`transition-transform duration-300 ${isActive ? 'text-gray-900 translate-y-[-2px]' : ''}`}>
                    {item.icon}
                  </div>
                  <span className={`
                    text-[10px] mt-0.5 font-bold transition-all duration-300
                    ${isActive ? 'opacity-100 text-black' : 'opacity-0 h-0 overflow-hidden'}
                  `}>
                    {item.label}
                  </span>
                </div>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </>
  );
}