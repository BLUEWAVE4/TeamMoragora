import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

// ⚖️ 공정함을 상징하는 천칭(Scales) 로고 아이콘
const ScalesLogo = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2.5">
    <path d="M12 3V21" stroke="#2D3350" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 21H15" stroke="#2D3350" strokeWidth="2" strokeLinecap="round"/>
    <path d="M5 7C7.5 6 16.5 6 19 7" stroke="#2D3350" strokeWidth="2" strokeLinecap="round"/>
    <path d="M5 7L3 13C3 13 3 15 5 15C7 15 7 13 7 13L5 7Z" fill="#FFBD43" stroke="#FFBD43" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M19 7L17 13C17 13 17 15 19 15C21 15 21 13 21 13L19 7Z" fill="#FFBD43" stroke="#FFBD43" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

// 🔍 커스텀 검색 아이콘 (천칭 로고와 굵기 밸런스를 맞춤)
const SearchIcon = ({ className }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
    <header className="bg-white/80 border-b border-gray-100 sticky top-0 z-[100] h-16 flex items-center shadow-sm backdrop-blur-md">
      <div className="max-w-md mx-auto px-5 w-full flex items-center justify-between">
        
        {isSearchOpen ? (
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* 🍏 iOS 스타일 검색 필드 컨테이너 */}
            <div className="flex-1 flex items-center bg-gray-100/80 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#FFBD43]/30 transition-all">
              <SearchIcon className="text-gray-400 mr-2" />
              <input
                autoFocus
                type="text"
                placeholder="논쟁 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[16px] text-[#2D3350] placeholder:text-gray-400"
              />
            </div>
            <button 
              type="button" 
              onClick={() => setIsSearchOpen(false)}
              className="flex-shrink-0 text-[15px] font-bold text-[#007AFF] active:opacity-60 transition-opacity">
              취소
            </button>
          </form>
        ) : (
          <>
            <Link to="/" className="flex items-center no-underline active:scale-95 transition-transform group">
              <ScalesLogo />
              <span className="text-xl font-black text-[#2D3350] tracking-tight group-hover:text-black transition-colors">
                모라고라<span className="text-[#FFBD43]">.</span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="w-10 h-10 flex items-center justify-center text-[#2D3350] rounded-full hover:bg-gray-50 active:scale-90 transition-all"
              >
                <SearchIcon />
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}