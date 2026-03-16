import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from "../../store/AuthContext";
import { getMyActiveDebates } from "../../services/api";

// --- 아이콘 컴포넌트 세트 ---

const HomeIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.8" : "2"} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const TrophyIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.8" : "2"} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);

const PlusIcon = ({ active }) => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
    <rect width="18" height="18" x="3" y="3" rx="5" ry="5"/>
    <g stroke={active ? "white" : "currentColor"}>
      <line x1="12" x2="12" y1="8" y2="16"/>
      <line x1="8" x2="16" y1="12" y2="12"/>
    </g>
  </svg>
);

const HallIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.8" : "2"} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
    <path d="M3 22h18"/><path d="M5 22V11"/><path d="M19 22V11"/><path d="M9 22V11"/><path d="M15 22V11"/><path d="m12 2-9 4v5h18V6l-9-4Z"/>
  </svg>
);

const UserIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.8" : "2"} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

// ===== 상태별 라벨/라우팅 =====
const STATUS_MAP = {
  waiting:     { label: '상대 대기중', color: 'text-amber-600', bg: 'bg-amber-50' },
  both_joined: { label: '주장 작성중', color: 'text-blue-600', bg: 'bg-blue-50' },
  arguing:     { label: '주장 작성중', color: 'text-blue-600', bg: 'bg-blue-50' },
  judging:     { label: '판결 진행중', color: 'text-purple-600', bg: 'bg-purple-50' },
  voting:      { label: '투표 진행중', color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

function getDebateRoute(debate, userId) {
  const { id, status, creator_id } = debate;
  switch (status) {
    case 'waiting':
      return creator_id === userId
        ? `/invite/${debate.invite_code}`
        : `/debate/${id}`;
    case 'both_joined':
    case 'arguing':
      return `/debate/${id}/argument`;
    case 'judging':
      return `/debate/${id}/judging`;
    case 'voting':
      return `/debate/${id}/judging`;
    default:
      return `/debate/${id}`;
  }
}

// --- 메인 탭바 컴포넌트 ---

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isLoggedIn = !!user;
  const isCreateActive = location.pathname === '/debate/create';

  // ===== 진행중 논쟁 상태 =====
  const [activeDebates, setActiveDebates] = useState([]);
  const [showSheet, setShowSheet] = useState(false);
  const sheetRef = useRef(null);

  const fetchActiveDebates = useCallback(async () => {
    if (!isLoggedIn) { setActiveDebates([]); return; }
    try {
      const data = await getMyActiveDebates();
      setActiveDebates(data || []);
    } catch {
      setActiveDebates([]);
    }
  }, [isLoggedIn]);

  // 로그인 상태 변경 시 + 페이지 이동 시 갱신
  useEffect(() => { fetchActiveDebates(); }, [fetchActiveDebates, location.pathname]);

  // 바텀시트 바깥 클릭 닫기
  useEffect(() => {
    if (!showSheet) return;
    const handleClick = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        setShowSheet(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSheet]);

  const hasActive = activeDebates.length > 0;

  const handleCreateClick = () => {
    if (!isLoggedIn) {
      const confirmMove = window.confirm(
        "논쟁 생성은 로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?"
      );
      if (confirmMove) {
        sessionStorage.setItem('redirectAfterLogin', '/debate/create');
        navigate('/login');
      }
      return;
    }

    // 진행중 논쟁이 있으면 바텀시트, 없으면 바로 생성
    if (hasActive) {
      setShowSheet(true);
    } else {
      navigate('/debate/create');
    }
  };

  const handleSelectDebate = (debate) => {
    setShowSheet(false);
    navigate(getDebateRoute(debate, user.id));
  };

  const handleNewDebate = () => {
    setShowSheet(false);
    navigate('/debate/create');
  };

  const menuItems = [
    { to: '/', icon: (active) => <HomeIcon active={active} /> },
    { to: '/ranking', icon: (active) => <TrophyIcon active={active} /> },
    { isButton: true, icon: (active) => <PlusIcon active={active} /> },
    { to: '/moragora', icon: (active) => <HallIcon active={active} /> },
    { to: '/profile', icon: (active) => <UserIcon active={active} /> }
  ];

  return (
    <>
      {/* ===== 바텀시트 오버레이 ===== */}
      {showSheet && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-end justify-center">
          <div
            ref={sheetRef}
            className="w-full max-w-[450px] bg-white rounded-t-2xl shadow-xl animate-slide-up pb-[env(safe-area-inset-bottom,0px)]"
          >
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* 진행중 논쟁 목록 */}
            <div className="px-4 pb-2">
              <p className="text-sm font-semibold text-gray-500 mb-2">진행중인 논쟁</p>
              {activeDebates.map((debate) => {
                const info = STATUS_MAP[debate.status] || STATUS_MAP.waiting;
                return (
                  <button
                    key={debate.id}
                    onClick={() => handleSelectDebate(debate)}
                    className="w-full flex items-center justify-between p-3 mb-1.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{debate.topic}</p>
                      <span className={`text-xs font-medium ${info.color}`}>{info.label}</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0 ml-2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                );
              })}
            </div>

            {/* 구분선 */}
            <div className="mx-4 border-t border-gray-100" />

            {/* 새 논쟁 만들기 */}
            <div className="px-4 py-3">
              <button
                onClick={handleNewDebate}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1B2A4A] text-white font-medium text-sm hover:bg-[#243658] active:bg-[#0f1a2e] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
                </svg>
                새 논쟁 만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 탭바 ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center">
        <nav className="w-full max-w-[450px] bg-white/95 backdrop-blur-md border-t border-gray-100 h-[60px] flex items-center justify-around pointer-events-auto pb-[env(safe-area-inset-bottom,0px)]">

          {menuItems.map((item, idx) => {
            if (item.isButton) {
              return (
                <button
                  key="center-btn"
                  onClick={handleCreateClick}
                  className={`relative flex-1 flex justify-center items-center h-full transition-all duration-200
                    ${isCreateActive ? 'text-black scale-110' : 'text-gray-800 active:scale-90'}`}
                >
                  {/* 금색 펄스 링 - 진행중 논쟁 있을 때 */}
                  {hasActive && !isCreateActive && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="w-[46px] h-[46px] rounded-xl border-2 border-[#D4AF37] animate-pulse-gold" />
                    </span>
                  )}
                  {item.icon(isCreateActive)}
                </button>
              );
            }

            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex-1 flex justify-center items-center h-full"
              >
                <div className={`transition-all duration-200 ${isActive ? 'text-black scale-110' : 'text-gray-400 hover:text-gray-600'}`}>
                  {item.icon(isActive)}
                </div>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ===== 인라인 스타일 (애니메이션) ===== */}
      <style>{`
        @keyframes pulse-gold {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        .animate-pulse-gold {
          animation: pulse-gold 2s ease-in-out infinite;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
