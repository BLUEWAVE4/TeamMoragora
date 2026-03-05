import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

export default function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // 검색 모드 상태 관리
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // 검색 결과 페이지로 이동 (나중에 구현 가능)
      navigate(`/search?q=${searchQuery}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="bg-white border-b border-gray-50 sticky top-0 z-50">
      <div className="max-w-md mx-auto px-5 h-16 flex items-center justify-between">
        
        {isSearchOpen ? (
          /* 🔥 검색 모드 활성화 시 보일 입력창 */
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
          /* 기본 헤더 모드 */
          <>
            <Link to="/" className="text-2xl font-black text-[#2D3350] tracking-tighter">
              모라고라<span className="text-[#FFBD43]">.</span>
            </Link>

            <div className="flex items-center gap-3">
              {/* 검색 버튼 클릭 시 검색 모드 활성화 */}
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full text-lg hover:bg-gray-100 transition-colors"
              >
                🔍
              </button>
              
              <button className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full text-lg relative">
                🔔
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>

              {user && (
                <button onClick={signOut} className="text-[10px] font-bold text-gray-400 ml-1">
                  LOGOUT
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}