import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

export default function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthPage = location.pathname === '/login';
  const isProtectedRouteArea =
    location.pathname.startsWith('/debate') ||
    location.pathname.includes('/auth/nickname') ||
    location.pathname.startsWith('/profile');

  const shouldHideNav = isAuthPage || isProtectedRouteArea;

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${searchQuery}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="bg-white border-b border-gray-50 sticky top-0 z-[100] h-16 flex items-center shadow-sm backdrop-blur-md bg-white/90">
      <div className="max-w-md mx-auto px-5 w-full flex items-center justify-between">
        
        {isSearchOpen ? (
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <input
              autoFocus
              type="text"
              placeholder="궁금한 논쟁을 검색해보세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-gray-50 border-none outline-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#FFBD43]/50"
            />
            <button 
              type="button" 
              onClick={() => setIsSearchOpen(false)}
              className="text-xs font-bold text-gray-400 px-2"
            >
              취소
            </button>
          </form>
        ) : (
          <>
            <Link to="/" className="text-2xl font-black text-[#2D3350] tracking-tighter">
              모라고라<span className="text-[#FFBD43]">.</span>
            </Link>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="w-9 h-9 flex items-center justify-center bg-gray-50 rounded-full text-lg hover:bg-gray-100 transition-colors"
              >
                🔍
              </button>
              
              {!shouldHideNav && (
                <nav className="flex items-center gap-2">
                  {user ? (
                    <>
                      <Link to="/profile" className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-50 text-gray-500 text-lg hover:bg-[#FFBD43] hover:text-white transition">
                        👤
                      </Link>
                    </>
                  ) : (
                    <Link to="/login" className="px-4 py-1.5 rounded-full bg-[#2D3350] text-white text-xs font-bold hover:opacity-90 transition ml-1">
                      로그인
                    </Link>
                  )}
                </nav>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
