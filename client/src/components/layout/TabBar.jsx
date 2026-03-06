import { NavLink, useNavigate } from 'react-router-dom';

export default function TabBar() {
  const navigate = useNavigate();

  // 활성화 스타일 로직
  const activeClass = "text-[#FF5C5C] font-semibold scale-110";
  const inactiveClass = "text-gray-400 font-medium";

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center z-50 px-4 pb-0">
      <nav className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[1.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-gray-100 h-20 flex items-center justify-around px-1 relative">
        
        {/* 홈 */}
        <NavLink to="/" className={({ isActive }) => `flex flex-col items-center flex-1 transition-all duration-300 ${isActive ? activeClass : inactiveClass}`}>
          <span className="text-xl mb-1">🏠</span>
          <span className="text-[11px]">홈</span>
          <div className={`w-1 h-1 bg-[#FF5C5C] rounded-full mt-1 transition-opacity duration-300`} style={{ opacity: window.location.pathname === '/' ? 1 : 0 }} />
        </NavLink>

        {/* 리그 */}
        <NavLink to="/ranking" className={({ isActive }) => `flex flex-col items-center flex-1 transition-all duration-300 ${isActive ? activeClass : inactiveClass}`}>
          <span className="text-xl mb-1">🏆</span>
          <span className="text-[11px]">리그</span>
          <div className={`w-1 h-1 bg-[#FF5C5C] rounded-full mt-1 transition-opacity duration-300`} style={{ opacity: window.location.pathname === '/ranking' ? 1 : 0 }} />
        </NavLink>

        {/* 작성 버튼 (+) */}
        <div className="flex-1 flex justify-center relative -mt-12">
          <button 
            onClick={() => navigate('/debate/create')}
            className="w-16 h-16 bg-[#2D3350] text-white rounded-full text-3xl flex items-center justify-center border-4 border-white shadow-[0_0_15px_rgba(0,0,0,0.1)] transition-all duration-300 hover:rotate-90 hover:shadow-[0_0_20px_rgba(0,0,0,0.2)] active:scale-95"
          >
            <span className="mb-1 leading-none inline-block">+</span>
          </button>
        </div>

        {/* 전당 */}
        <NavLink to="/moragora" className={({ isActive }) => `flex flex-col items-center flex-1 transition-all duration-300 ${isActive ? activeClass : inactiveClass}`}>
          <span className="text-xl mb-1">🏛</span>
          <span className="text-[11px]">전당</span>
          <div className={`w-1 h-1 bg-[#FF5C5C] rounded-full mt-1 transition-opacity duration-300`} style={{ opacity: window.location.pathname === '/moragora' ? 1 : 0 }} />
        </NavLink>

        {/* MY */}
        <NavLink to="/profile" className={({ isActive }) => `flex flex-col items-center flex-1 transition-all duration-300 ${isActive ? activeClass : inactiveClass}`}>
          <span className="text-xl mb-1">👤</span>
          <span className="text-[11px]">MY</span>
          <div className={`w-1 h-1 bg-[#FF5C5C] rounded-full mt-1 transition-opacity duration-300`} style={{ opacity: window.location.pathname === '/profile' ? 1 : 0 }} />
        </NavLink>

      </nav>
    </div>
  );
}