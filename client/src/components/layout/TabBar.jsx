import { NavLink, useNavigate, useLocation } from 'react-router-dom';

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

  return (
    /* 🍏 수정 포인트: pb-10을 삭제하여 바닥에 밀착시키고, pointer-events 설정을 추가했습니다. */
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex justify-center z-50 pointer-events-none">
      <nav className="w-full bg-white/75 backdrop-blur-[25px] rounded-t-[2.5rem] shadow-[0_-10px_30px_rgba(0,0,0,0.05)] border-t border-x border-white/50 h-[80px] flex items-center justify-around px-2 relative pointer-events-auto">
        
        {[
          { to: '/', icon: <HomeIcon />, label: '홈' },
          { to: '/ranking', icon: <TrophyIcon />, label: '리그' },
          { isButton: true },
          { to: '/moragora', icon: <HallIcon />, label: '전당' },
          { to: '/profile', icon: <UserIcon />, label: 'MY' }
        ].map((item, idx) => {
          if (item.isButton) {
            return (
              <div key="center-btn" className="flex items-center justify-center flex-1 h-full">
                <button 
                  onClick={() => navigate('/debate/create')}
                  className="group flex items-center justify-center w-[56px] h-[56px] bg-[#1c1c1e] text-white rounded-[1.2rem] shadow-lg active:scale-90 transition-all duration-400 border border-white/10"
                >
                  <span className="text-3xl font-light translate-y-[-1px]">+</span>
                </button>
              </div>
            );
          }

          const isActive = location.pathname === item.to;

          return (
            <NavLink 
              key={item.to}
              to={item.to} 
              className="flex items-center justify-center flex-1 h-full relative no-underline outline-none"
            >
              <div className={`
                flex flex-col items-center justify-center w-[58px] h-[58px] transition-all duration-500 rounded-[1.2rem]
                ${isActive 
                  ? 'bg-white shadow-sm border-[0.5px] border-black/5 scale-110 text-black pt-1' 
                  : 'bg-transparent text-gray-400'}
              `}>
                <div className="flex items-center justify-center">
                  {item.icon}
                </div>
                
                <div className={`
                  overflow-hidden transition-all duration-500
                  ${isActive ? 'max-h-5 opacity-100 mt-0.5' : 'max-h-0 opacity-0 mt-0'}
                `}>
                  <span className="text-[10px] font-bold tracking-tight">
                    {item.label}
                  </span>
                </div>
              </div>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}