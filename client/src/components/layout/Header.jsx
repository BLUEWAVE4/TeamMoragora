import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

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

const SEARCH_CONFIG = {
  '/': { placeholder: '주제 또는 작성자 검색', param: 'q' },
  '/ranking': { placeholder: '사용자 검색', param: 'q' },
  '/moragora': { placeholder: '주제 또는 작성자 검색', param: 'q' },
  '/profile': { placeholder: '최근 논쟁 기록 검색', param: 'q' },
};

const HIDE_PATHS = ['/debate/create', '/moragora/'];

const NOTIF_ICON = {
  verdict_complete: '⚖️',
  argument_submitted: '📝',
  comment: '💬',
  vote_finalized: '🗳️',
  tier_up: '🏆',
  daily_debate: '📢',
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return '방금';
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  // 알림 상태
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const pathname = location.pathname;
  const config = SEARCH_CONFIG[pathname] || SEARCH_CONFIG['/'];
  const shouldHide = HIDE_PATHS.some(p => pathname.startsWith(p));

  useEffect(() => {
    setIsSearchOpen(false);
    setSearchQuery(searchParams.get('q') || '');
    setShowNotif(false);
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

  // 읽지 않은 알림 수 폴링
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const res = await getUnreadCount();
        setUnreadCount(res.data?.unreadCount || res.unreadCount || 0);
      } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // 알림 바텀시트 열 때 목록 로드
  useEffect(() => {
    if (!showNotif || !user) return;
    document.body.style.overflow = 'hidden';
    const fetch = async () => {
      try {
        const res = await getNotifications();
        setNotifications(res.data?.notifications || res.notifications || []);
        setUnreadCount(res.data?.unreadCount || res.unreadCount || 0);
      } catch {}
    };
    fetch();
    return () => { document.body.style.overflow = ''; };
  }, [showNotif, user]);

  // 바깥 클릭 닫기
  useEffect(() => {
    if (!showNotif) return;
    const handle = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showNotif]);

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      try { await markNotificationRead(notif.id); } catch {}
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setShowNotif(false);
    if (notif.link) navigate(notif.link);
  };

  const handleReadAll = async () => {
    try { await markAllNotificationsRead(); } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  if (shouldHide) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) setSearchParams({ q });
    else setSearchParams({});
    setIsSearchOpen(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchParams({});
    setIsSearchOpen(false);
  };

  const currentQuery = searchParams.get('q');

  return (
    <>
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
                  onClick={() => user ? setShowNotif(true) : navigate('/login')}
                  className="w-9 h-9 flex items-center justify-center text-[#2D3350]/50 rounded-full active:scale-90 transition-all relative"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#E63946] text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* 알림 바텀시트 */}
      <AnimatePresence>
        {showNotif && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNotif(false)}
              className="fixed inset-0 bg-black/40 z-[200]"
            />
            <div className="fixed inset-0 z-[201] flex items-end justify-center pointer-events-none">
              <motion.div
                ref={notifRef}
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="w-full max-w-[440px] bg-[#F5F0E8] rounded-t-2xl max-h-[70vh] flex flex-col shadow-xl pointer-events-auto"
              >
                {/* 핸들 */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-[#1B2A4A]/10 rounded-full" />
                </div>

                {/* 헤더 */}
                <div className="px-5 pt-1 pb-3 flex items-center justify-between">
                  <p className="text-[14px] font-bold text-[#1B2A4A]">알림</p>
                  {unreadCount > 0 && (
                    <button onClick={handleReadAll} className="text-[12px] font-bold text-[#007AFF] active:opacity-50">
                      모두 읽음
                    </button>
                  )}
                </div>

                {/* 알림 목록 */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-[14px] text-[#1B2A4A]/30 font-bold">알림이 없습니다</p>
                    </div>
                  ) : notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                        n.is_read ? 'bg-white/60' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-[18px] mt-0.5">{NOTIF_ICON[n.type] || '🔔'}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-bold truncate ${n.is_read ? 'text-[#1B2A4A]/50' : 'text-[#1B2A4A]'}`}>
                            {n.title}
                          </p>
                          {n.message && (
                            <p className="text-[11px] text-[#1B2A4A]/40 truncate mt-0.5">{n.message}</p>
                          )}
                          <p className="text-[10px] text-[#1B2A4A]/25 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.is_read && (
                          <div className="w-2 h-2 rounded-full bg-[#D4AF37] shrink-0 mt-1.5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
