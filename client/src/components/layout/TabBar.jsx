import { NavLink, useNavigate, useLocation } from 'react-router-dom';

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const TrophyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);
const HallIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22h18"/><path d="M5 22V11"/><path d="M19 22V11"/><path d="M9 22V11"/><path d="M15 22V11"/><path d="m12 2-9 4v5h18V6l-9-4Z"/></svg>
);
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex justify-center z-50 px-6 pb-8">
      <nav className="w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/40 h-20 flex items-center justify-around px-4 relative">
        
        {[
          { to: '/', icon: <HomeIcon />, label: '홈' },
          { to: '/ranking', icon: <TrophyIcon />, label: '리그' },
          { isButton: true },
          { to: '/moragora', icon: <HallIcon />, label: '전당' },
          { to: '/profile', icon: <UserIcon />, label: 'MY' }
        ].map((item, idx) => {
          if (item.isButton) {
            return (
              <div key="center-btn" className="relative flex flex-col items-center">
                <button 
                  onClick={() => navigate('/debate/create')}
                  className="w-14 h-14 bg-[#2D3350] text-white rounded-[1.2rem] flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 border border-white/20"
                >
                  <span className="text-3xl font-light">+</span>
                </button>
              </div>
            );
          }

          const isActive = location.pathname === item.to;

          return (
            <NavLink 
              key={item.to}
              to={item.to} 
              className="flex flex-col items-center flex-1 relative group"
            >
              {/* 🍏 Mac 스타일: 활성화 시 위로 이동(-translate-y-2) 및 확대(scale-110) */}
              <div className={`
                w-12 h-12 rounded-[1rem] flex items-center justify-center transition-all duration-500 ease-out
                ${isActive 
                  ? 'bg-white shadow-xl border border-gray-100 -translate-y-3 scale-110 text-black' 
                  : 'bg-transparent text-gray-400 hover:text-gray-600'}
              `}>
                {item.icon}
                
                {/* 하단 점 표시 */}
                {isActive && (
                  <div className="absolute bottom-1 w-1 h-1 bg-black rounded-full" />
                )}
              </div>
              
              {/* 🍏 라벨 애니메이션: 활성화 시에만 슥- 나타남 */}
              <span className={`
                absolute -bottom-1 text-[10px] font-black transition-all duration-500 ease-out
                ${isActive ? 'opacity-100 translate-y-0 text-black' : 'opacity-0 translate-y-2 text-gray-400'}
              `}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}