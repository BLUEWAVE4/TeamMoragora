import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from "../../store/AuthContext";
import { getMyActiveDebates, deleteDebate } from "../../services/api";

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

const PlusIcon = ({ active, pulse }) => {
  // 진행중 논쟁 있으면 말풍선(진행중) 아이콘
  if (pulse) {
    return (
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none" className="transition-all duration-300">
        <rect x="4" y="4" width="34" height="34" rx="10" ry="10"
          fill="none" strokeWidth="1.8" className="animate-stroke-pulse" />
        {/* 느낌표 */}
        <line x1="21" y1="14" x2="21" y2="23" strokeWidth="2.5" strokeLinecap="round" className="animate-stroke-pulse" />
        <circle cx="21" cy="27" r="1.5" className="animate-stroke-pulse" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" className="transition-all duration-300">
      <rect x="4" y="4" width="34" height="34" rx="10" ry="10"
        fill={active ? '#1B2A4A' : 'none'} stroke={active ? '#1B2A4A' : '#1B2A4A'} strokeWidth="1.8" />
      <line x1="21" y1="13" x2="21" y2="29" stroke={active ? 'white' : '#1B2A4A'} strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="21" x2="29" y2="21" stroke={active ? 'white' : '#1B2A4A'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

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

// ===== 남은 기간 계산 =====
function getTimeRemaining(deadline) {
  if (!deadline) return '';
  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return '곧 마감';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}일 ${hours}시간 남음`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}시간 ${mins}분 남음`;
  return `${mins}분 남음`;
}

function getStatusLabel(debate) {
  if (debate.status === 'voting') {
    const remaining = getTimeRemaining(debate.vote_deadline);
    return { label: `시민 투표 진행중${remaining ? `(${remaining})` : ''}`, color: 'text-emerald-600' };
  }
  return STATUS_MAP[debate.status] || STATUS_MAP.waiting;
}

// ===== 상태별 라벨/라우팅 =====
const STATUS_MAP = {
  waiting:     { label: '상대 대기중', color: 'text-amber-600' },
  both_joined: { label: '주장 작성중', color: 'text-blue-600' },
  arguing:     { label: '주장 작성중', color: 'text-blue-600' },
  judging:     { label: '판결 진행중', color: 'text-purple-600' },
  voting:      { label: '시민 투표 진행중', color: 'text-emerald-600' },
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

  // ===== 진행중 논쟁 상태 (커서 기반 lazy loading) =====
  const [activeDebates, setActiveDebates] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const sheetRef = useRef(null);
  const listRef = useRef(null);

  const fetchActiveDebates = useCallback(async (cursor) => {
    if (!isLoggedIn || !user) { setActiveDebates([]); setHasMore(false); return; }
    try {
      const res = await getMyActiveDebates(cursor);
      const { items, hasMore: more } = res;
      if (cursor) {
        setActiveDebates(prev => [...prev, ...items]);
      } else {
        setActiveDebates(items || []);
      }
      setHasMore(more);
    } catch {
      if (!cursor) setActiveDebates([]);
      setHasMore(false);
    }
  }, [isLoggedIn, user]);

  // 로그인 상태 변경 시 + 페이지 이동 시 갱신
  useEffect(() => { fetchActiveDebates(); }, [fetchActiveDebates, location.pathname]);

  // 스크롤 감지 → 추가 로드
  const handleScroll = useCallback(() => {
    if (!hasMore || loadingMore) return;
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setLoadingMore(true);
      const lastItem = activeDebates[activeDebates.length - 1];
      fetchActiveDebates(lastItem?.created_at).finally(() => setLoadingMore(false));
    }
  }, [hasMore, loadingMore, activeDebates, fetchActiveDebates]);

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

  const hasActive = activeDebates.some(d => localStorage.getItem(`mute_debate_${d.id}`) !== '1');

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
    { isButton: true, icon: (active, pulse) => <PlusIcon active={active} pulse={pulse} /> },
    { to: '/moragora', icon: (active) => <HallIcon active={active} /> },
    { to: '/profile', icon: (active) => <UserIcon active={active} /> }
  ];

  return (
    <>
      {/* ===== 바텀시트 오버레이 ===== */}
      {showSheet && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center">
          <div
            ref={sheetRef}
            className="w-full max-w-[440px] bg-gradient-to-b from-[#F5F0E8] to-white rounded-t-2xl shadow-xl animate-slide-up pb-[env(safe-area-inset-bottom,0px)]"
          >
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#1B2A4A]/15" />
            </div>

            {/* 헤더 */}
            <div className="px-5 pt-2 pb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#1B2A4A]/35">진행중인 논쟁</p>
            </div>

            {/* 진행중 논쟁 목록 */}
            <div ref={listRef} onScroll={handleScroll} className="px-5 pb-3 space-y-2 max-h-[40vh] overflow-y-auto">
              {activeDebates.map((debate) => {
                const info = getStatusLabel(debate);
                const muteKey = `mute_debate_${debate.id}`;
                const isMuted = localStorage.getItem(muteKey) === '1';
                return (
                  <div key={debate.id} className="flex items-center gap-2">
                    {/* 논쟁 카드 (상세보기 포함) */}
                    <button
                      onClick={() => handleSelectDebate(debate)}
                      className="flex-1 min-w-0 flex items-center justify-between p-3 rounded-2xl bg-white border-2 border-[#1B2A4A]/5 active:scale-[0.98] transition-all text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-[#1B2A4A] truncate">{debate.topic}</p>
                        <span className={`text-[11px] font-bold ${info.color}`}>{info.label}</span>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 ml-2">
                        <polyline points="9 6 15 12 9 18"/>
                      </svg>
                    </button>

                    {/* 알림 토글 (오른쪽) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMuted) localStorage.removeItem(muteKey);
                        else localStorage.setItem(muteKey, '1');
                        setActiveDebates(prev => [...prev]);
                      }}
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 active:scale-90 transition-all"
                    >
                      {isMuted ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B2A4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.25">
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
              {loadingMore && (
                <p className="text-center text-[#1B2A4A]/30 text-[12px] py-2 animate-pulse">불러오는 중...</p>
              )}
              {activeDebates.length === 0 && (
                <p className="text-center text-[#1B2A4A]/20 text-[13px] py-4">진행중인 논쟁이 없습니다.</p>
              )}
            </div>

            {/* 구분선 */}
            <div className="mx-5 border-t border-[#1B2A4A]/5" />

            {/* 새 논쟁 + 닫기 */}
            <div className="px-5 py-3 flex gap-2">
              <button
                onClick={handleNewDebate}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-serif font-bold text-[14px] bg-[#1B2A4A] text-[#D4AF37] border-2 border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-[#1B2A4A] active:scale-95 transition-all duration-300 shadow-md"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
                </svg>
                새 논쟁
              </button>
              <button
                onClick={() => setShowSheet(false)}
                className="flex-1 py-3 rounded-xl font-serif font-bold text-[14px] text-[#1B2A4A]/40 bg-white border-2 border-[#1B2A4A]/10 hover:border-[#1B2A4A]/20 active:scale-95 transition-all duration-300"
              >
                닫기
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
                  {item.icon(isCreateActive, hasActive && !isCreateActive)}
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
        @keyframes stroke-pulse {
          0%, 100% { stroke: #1B2A4A; opacity: 0.4; }
          50% { stroke: #D4AF37; opacity: 1; }
        }
        .animate-stroke-pulse {
          animation: stroke-pulse 2s ease-in-out infinite;
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
