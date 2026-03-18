import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';

const ScalesLogo = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2.5">
    <path d="M12 3V21" stroke="#2D3350" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 21H15" stroke="#2D3350" strokeWidth="2" strokeLinecap="round"/>
    <path d="M5 7C7.5 6 16.5 6 19 7" stroke="#2D3350" strokeWidth="2" strokeLinecap="round"/>
    <path d="M5 7L3 13C3 13 3 15 5 15C7 15 7 13 7 13L5 7Z" fill="#FFBD43" stroke="#FFBD43" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M19 7L17 13C17 13 17 15 19 15C21 15 21 13 21 13L19 7Z" fill="#FFBD43" stroke="#FFBD43" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

const SearchIcon = ({ className }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// 경로별 검색 설정
const SEARCH_CONFIG = {
  '/': { placeholder: '주제 또는 작성자 검색', param: 'q' },
  '/ranking': { placeholder: '사용자 검색', param: 'q' },
  '/moragora': { placeholder: '주제 또는 작성자 검색', param: 'q' },
  '/profile': { placeholder: '최근 논쟁 기록 검색', param: 'q' },
};

// 헤더 숨김 경로
const HIDE_PATHS = ['/debate/create', '/moragora/'];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  const pathname = location.pathname;
  const config = SEARCH_CONFIG[pathname] || SEARCH_CONFIG['/'];
  const shouldHide = HIDE_PATHS.some(p => pathname.startsWith(p));

  // 페이지 이동 시 검색 닫기
  useEffect(() => {
    setIsSearchOpen(false);
    setSearchQuery(searchParams.get('q') || '');
  }, [pathname]);

  // 스크롤 방향 감지
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 10) setVisible(true);
      else if (currentY > lastScrollY.current + 5) setVisible(false);
      else if (currentY < lastScrollY.current - 5) setVisible(true);
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (shouldHide) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      // 현재 페이지에 쿼리 파라미터 추가
      setSearchParams({ q });
    } else {
      // 검색어 비우면 파라미터 제거
      setSearchParams({});
    }
    setIsSearchOpen(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchParams({});
    setIsSearchOpen(false);
  };

  const currentQuery = searchParams.get('q');

  return (
    <header
      className={`bg-white/80 border-b border-gray-100 sticky top-0 z-[100] h-14 flex items-center backdrop-blur-md transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-md mx-auto px-5 w-full flex items-center justify-between">
        {isSearchOpen ? (
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-3">
            <div className="flex-1 flex items-center bg-gray-100/80 rounded-xl px-3 py-1.5">
              <SearchIcon className="text-gray-400 mr-2" />
              <input
                autoFocus
                type="text"
                placeholder={config.placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm text-[#2D3350] placeholder:text-gray-400"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="text-gray-400 text-lg leading-none ml-1">&times;</button>
              )}
            </div>
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-[13px] font-bold text-[#1B2A4A]/50 active:opacity-60"
            >
              취소
            </button>
          </form>
        ) : (
          <>
            <Link to="/" className="flex items-center no-underline active:scale-95 transition-transform">
              <ScalesLogo />
              <span className="text-lg font-black text-[#2D3350] tracking-tight">
                모라고라<span className="text-[#FFBD43]">.</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              {/* 검색 활성화 중이면 검색어 뱃지 표시 */}
              {currentQuery && (
                <button
                  onClick={() => { setSearchParams({}); }}
                  className="text-[11px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-1 rounded-full flex items-center gap-1 active:scale-95 transition-all"
                >
                  "{currentQuery}" <span className="text-[#D4AF37]/50">&times;</span>
                </button>
              )}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="w-9 h-9 flex items-center justify-center text-[#2D3350]/50 rounded-full active:scale-90 transition-all"
              >
                <SearchIcon />
              </button>
              <button
                onClick={() => navigate('/notifications')}
                className="w-9 h-9 flex items-center justify-center text-[#2D3350]/50 rounded-full active:scale-90 transition-all relative"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
