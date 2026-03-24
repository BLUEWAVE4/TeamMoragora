import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../store/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  deleteNotification,
  deleteAllNotifications,
} from '../../services/api';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

// --- 아이콘 컴포넌트 정의 ---

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

// 알림용 SVG 아이콘들 (HomeIcon 스타일 적용)
const VerdictIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.8" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
  </svg>
);

const CommentIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.8" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const BellIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.8" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
  </svg>
);

const TrashIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const NOTIF_CONFIG = {
  verdict_complete: { icon: VerdictIcon, color: 'text-[#5856D6]', bg: 'bg-[#E5E5EA]' }, // 판결 (퍼플)
  comment: { icon: CommentIcon, color: 'text-[#007AFF]', bg: 'bg-[#E5E5EA]' },        // 댓글 (블루)
  default: { icon: BellIcon, color: 'text-[#8E8E93]', bg: 'bg-[#F2F2F7]' },         // 기본 (그레이)
};

// --- 유틸 함수 ---

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return '방금';
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

function NotifCard({ n, onDelete, onClick, isDark }) {
  const x = useMotionValue(0);
  const SNAP = -72;

  const trashOpacity = useTransform(x, [0, SNAP * 0.4, SNAP], [0, 0.5, 1]);
  const trashScale = useTransform(x, [0, SNAP * 0.5, SNAP], [0.5, 0.75, 1]);

  const config = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.default;
  const IconComponent = config.icon;

  const handleDragEnd = (_, info) => {
    if (info.offset.x < SNAP * 0.5) x.set(SNAP);
    else x.set(0);
  };

  return (
    <div className="relative mb-2" style={{ borderRadius: '16px', overflow: 'hidden' }}>
      <div className="absolute inset-y-0 right-0 flex items-center justify-center" style={{ width: '72px' }}>
        <motion.button
          style={{ opacity: trashOpacity, scale: trashScale }}
          onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
          className="w-15 h-15 rounded-2xl bg-[#FF3B30] flex flex-col items-center justify-center gap-0.5"
        >
          <span className="text-white"><TrashIcon size={17} /></span>
          <span className="text-white text-[16px] font-bold">삭제</span>
        </motion.button>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: SNAP, right: 0 }}
        dragElastic={0.05}
        style={{ x, borderRadius: '16px' }}
        onDragEnd={handleDragEnd}
        onClick={() => x.get() < -8 ? x.set(0) : onClick(n)}
        className={`relative flex items-start gap-3.5 px-4 py-3.5 cursor-pointer select-none transition-colors ${
          n.is_read
            ? (isDark ? 'bg-white/5' : 'bg-white/40')
            : (isDark ? 'bg-[#16213e]' : 'bg-white')
        }`}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-white/10' : config.bg} ${n.is_read ? 'opacity-50' : config.color}`}>
          <IconComponent active={!n.is_read} />
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <p className={`text-[13.5px] leading-snug font-semibold ${n.is_read ? (isDark ? 'text-gray-500' : 'text-[#8E8E93]') : (isDark ? 'text-gray-100' : 'text-[#1C1C1E]')}`}>
            {n.title}
          </p>
          <p className={`text-[12px] mt-0.5 truncate ${n.is_read ? (isDark ? 'text-gray-600' : 'text-[#AEAEB2]') : (isDark ? 'text-gray-400' : 'text-[#6D6D72]')}`}>
            {n.message}
          </p>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-500' : 'text-[#8E8E93]'}`}>{timeAgo(n.created_at)}</p>
        </div>
        {!n.is_read && <div className="w-2.5 h-2.5 rounded-full bg-[#007AFF] shrink-0 mt-1.5" />}
      </motion.div>
    </div>
  );
}

const SEARCH_CONFIG = {
  '/': { placeholder: '주제 또는 작성자 검색' },
  '/ranking': { placeholder: '사용자 검색' },
  '/moragora': { placeholder: '주제 또는 작성자 검색' },
  '/profile': { placeholder: '최근 논쟁 기록 검색' },
};

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const pathname = location.pathname;
  const config = SEARCH_CONFIG[pathname] || SEARCH_CONFIG['/'];
  const shouldHide = ['/debate/create', '/moragora/', '/argument'].some(p => pathname.startsWith(p));

  useEffect(() => {
    setIsSearchOpen(false);
    setSearchQuery(searchParams.get('q') || '');
    setShowNotif(false);
  }, [pathname]);

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

  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const res = await getUnreadCount();
        setUnreadCount(res.data?.unreadCount || res.unreadCount || 0);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!showNotif || !user) return;
    const fetchNotifs = async () => {
      try {
        const res = await getNotifications();
        setNotifications(res.data?.notifications || res.notifications || []);
        setUnreadCount(res.data?.unreadCount || res.unreadCount || 0);
      } catch {}
    };
    fetchNotifs();
  }, [showNotif, user]);

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

  const handleDeleteOne = async (id) => {
    try { await deleteNotification(id); } catch {}
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleDeleteAll = async () => {
    try { await deleteAllNotifications(); } catch {}
    setNotifications([]);
    setUnreadCount(0);
  };

  if (shouldHide) return null;

  return (
    <>
      <header className={`bg-white/80 border-b border-gray-100 sticky top-0 z-[100] h-14 flex items-center backdrop-blur-md transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-md mx-auto px-5 w-full flex items-center justify-between">
          {isSearchOpen ? (
            <form onSubmit={(e) => { e.preventDefault(); setSearchParams(searchQuery ? { q: searchQuery } : {}); setIsSearchOpen(false); }} className="flex-1 flex items-center bg-gray-100/80 rounded-xl px-3 py-1.5 mr-2">
              <SearchIcon className="text-gray-400 mr-2 shrink-0" />
              <input autoFocus type="text" placeholder={config.placeholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-sm text-[#2D3350] min-w-0" />
              <button type="button" onClick={() => setIsSearchOpen(false)} className="text-[11px] font-bold text-[#1B2A4A]/40 shrink-0 ml-2">취소</button>
            </form>
          ) : (
            <Link to="/" className="flex items-center no-underline active:scale-95 transition-transform">
              <ScalesLogo /><span className="text-lg font-black text-[#2D3350]">모라고라<span className="text-[#FFBD43]">.</span></span>
            </Link>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {!isSearchOpen && <button onClick={() => setIsSearchOpen(true)} className="w-9 h-9 flex items-center justify-center text-[#2D3350]/50 rounded-full"><SearchIcon /></button>}
            <button onClick={() => user ? setShowNotif(!showNotif) : navigate('/login')} className="w-9 h-9 flex items-center justify-center text-[#2D3350]/50 rounded-full relative">
              <BellIcon active={unreadCount > 0} />
              {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#FF3B30] text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>
            <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-full">
              {isDark ? <Sun size={20} strokeWidth={2} className="text-[#D4AF37]" /> : <Moon size={20} strokeWidth={2} className="text-[#2D3350]/50" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showNotif && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNotif(false)} className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-[2px]" />
            <motion.div
              ref={notifRef}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => { if (info.offset.y < -80) setShowNotif(false); }}
              initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }}
              transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
              className="fixed top-0 left-0 right-0 z-[201] w-full max-w-md mx-auto flex flex-col"
              style={{ background: isDark ? 'rgba(26,26,46,0.98)' : 'rgba(242,242,247,0.98)', backdropFilter: 'blur(30px)', borderBottomLeftRadius: '28px', borderBottomRightRadius: '28px', boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.15)', maxHeight: '90vh' }}
            >
              <div className="pt-8 px-6 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className={`text-[22px] font-bold ${isDark ? 'text-gray-100' : 'text-[#1C1C1E]'}`}>알림</h2>
                  {unreadCount > 0 && <span className="bg-[#FF3B30] text-white text-[11px] font-black px-2 py-0.5 rounded-full">{unreadCount}</span>}
                </div>
                {notifications.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button onClick={handleReadAll} className={`text-[14px] font-semibold ${isDark ? 'text-[#64D2FF]' : 'text-[#007AFF]'}`}>모두 읽음</button>
                    <button onClick={handleDeleteAll} className="text-[14px] font-semibold text-[#FF3B30]">전체 삭제</button>
                  </div>
                )}
              </div>
              <div className={`mx-6 h-[0.5px] ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />
              <div className="overflow-y-auto px-4 pt-4 pb-4" style={{ flex: 1 }}>
                {notifications.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center py-20 ${isDark ? 'opacity-40' : 'opacity-30'}`}>
                    <BellIcon active={false} /><p className={`text-[16px] font-bold mt-2 ${isDark ? 'text-gray-400' : ''}`}>알림이 비어있습니다</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {notifications.map((n) => (
                      <motion.div key={n.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 100 }}>
                        <NotifCard n={n} onDelete={handleDeleteOne} onClick={handleNotifClick} isDark={isDark} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
              <div className="w-full flex justify-center pt-2 pb-4 cursor-grab active:cursor-grabbing"><div className={`w-10 h-1.5 rounded-full ${isDark ? 'bg-white/20' : 'bg-gray-300/80'}`} /></div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}