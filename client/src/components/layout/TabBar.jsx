import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useAuth } from "../../store/AuthContext";
import { useTheme } from "../../store/ThemeContext";
import { getMyActiveDebates, deleteDebate } from "../../services/api";
import MoragoraModal from '../common/MoragoraModal';

// --- 아이콘 컴포넌트 세트 ---

const HomeIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.8" : "2"} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const LiveIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.8" : "2"} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-200">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    {active && <circle cx="12" cy="11" r="2" fill="currentColor" stroke="none"><animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/></circle>}
  </svg>
);

const PlusIcon = ({ active, pulse, isDark }) => {
  // 진행중 논쟁 있으면 말풍선(진행중) 아이콘
  if (pulse) {
    const cls = isDark ? 'animate-stroke-pulse-dark' : 'animate-stroke-pulse';
    return (
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none" className="transition-all duration-300">
        <rect x="4" y="4" width="34" height="34" rx="10" ry="10"
          fill="none" strokeWidth="1.8" className={cls} />
        {/* 느낌표 */}
        <line x1="21" y1="14" x2="21" y2="23" strokeWidth="2.5" strokeLinecap="round" className={cls} />
        <circle cx="21" cy="27" r="1.5" className={cls} fill="currentColor" />
      </svg>
    );
  }

  const color = isDark ? '#D4AF37' : '#1B2A4A';
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" className="transition-all duration-300">
      <rect x="4" y="4" width="34" height="34" rx="10" ry="10"
        fill={active ? color : 'none'} stroke={color} strokeWidth="1.8" />
      <line x1="21" y1="13" x2="21" y2="29" stroke={active ? (isDark ? '#1B2A4A' : 'white') : color} strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="21" x2="29" y2="21" stroke={active ? (isDark ? '#1B2A4A' : 'white') : color} strokeWidth="2" strokeLinecap="round" />
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
  // 실시간 채팅 모드인 경우 라벨 변경
  if (debate.mode === 'chat') {
    return { label: '실시간 채팅 논쟁 중', color: 'text-red-500 font-black' };
  }
  if (debate.status === 'voting') {
    // vote_duration(일) + created_at 기반 남은 시간 계산
    const voteDuration = debate.vote_duration ?? 1;
    const deadline = debate.created_at
      ? new Date(new Date(debate.created_at).getTime() + voteDuration * 86400000)
      : debate.vote_deadline ? new Date(debate.vote_deadline) : null;
    const remaining = deadline ? getTimeRemaining(deadline) : '';
    return { label: `시민 투표 진행중${remaining ? `(${remaining})` : ''}`, color: 'text-emerald-600' };
  }
  // arguing 상태지만 양측 주장이 모두 제출된 경우 → 판결 대기중
  if (debate.status === 'arguing' && debate.argument_count >= 4) {
    return { label: '판결 대기중', color: 'text-purple-600' };
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
  const { id, status, creator_id, mode, invite_code } = debate;

 // 1. 실시간 채팅 모드라면 상태가 무엇이든 무조건 채팅방으로!
if (mode === 'chat') {
    return `/debate/${id}/chat`;
  }

 switch (status) {
    case 'waiting':
      return creator_id === userId
        ? `/invite/${invite_code}`
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
};
// --- 메인 탭바 컴포넌트 ---

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const isLoggedIn = !!user;
  const isCreateActive = location.pathname === '/debate/create';

  // ===== 진행중 논쟁 상태 (커서 기반 lazy loading) =====
  const [activeDebates, setActiveDebates] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const sheetRef = useRef(null);
  const listRef = useRef(null);

  const fetchActiveDebates = useCallback(async (cursor) => {
    if (!isLoggedIn || !user) { setActiveDebates([]); setHasMore(false); return []; }
    try {
      const res = await getMyActiveDebates(cursor);
      const { items, hasMore: more } = res;
      if (cursor) {
        setActiveDebates(prev => [...prev, ...items]);
      } else {
        setActiveDebates(items || []);
      }
      setHasMore(more);
      return items || [];
    } catch {
      if (!cursor) setActiveDebates([]);
      setHasMore(false);
      return [];
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

  // 바텀시트 바깥 클릭 닫기 + 외부 스크롤 차단
  useEffect(() => {
    if (!showSheet) return;
    document.body.style.overflow = 'hidden';
    const handleClick = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        setShowSheet(false);
        setIsEditing(false);
        setDeleting(null);
        markAsSeen();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.body.style.overflow = '';
    };
  }, [showSheet]);

  const hasActiveDebates = activeDebates.length > 0;
  // 마지막으로 바텀시트를 확인한 시점 vs 논쟁 목록 변경 여부로 ! 표시
  const [hasNewActivity, setHasNewActivity] = useState(false);

  const markAsSeen = useCallback(() => {
    setHasNewActivity(false);
    if (activeDebates.length > 0) {
      const currentIds = activeDebates.map(d => d.id).sort().join(',');
      localStorage.setItem('tabbar_last_seen_ids', currentIds);
    }
  }, [activeDebates]);

  useEffect(() => {
    if (!activeDebates.length) { setHasNewActivity(false); return; }
    const lastSeen = localStorage.getItem('tabbar_last_seen_ids') || '';
    const currentIds = activeDebates.map(d => d.id).sort().join(',');
    if (lastSeen !== currentIds) setHasNewActivity(true);
  }, [activeDebates]);

  const [showDraftModal, setShowDraftModal] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: 'error', title: '', description: '', onConfirm: null });
  const showModal = (type, title, description, onConfirm) => setModal({ isOpen: true, type, title, description, onConfirm });
  const closeModal = () => setModal({ isOpen: false, type: 'error', title: '', description: '', onConfirm: null });

    const handleCreateClick = () => {
    if (!isLoggedIn) {
      showModal('login', '로그인이 필요합니다', '논쟁 생성은 로그인이 필요한 서비스입니다.\n로그인 후 이용할 수 있습니다.', () => {
        sessionStorage.setItem('redirectAfterLogin', '/debate/create');
        navigate('/login');
      });
      return;
    }

    // ✅ 논쟁 생성 페이지에서는 드래프트 체크 없이 바로 바텀시트
    if (isCreateActive) {
      setShowSheet(true);
      markAsSeen();
      fetchActiveDebates(); // 백그라운드 갱신
      return;
    }

    const draft = localStorage.getItem('debate_create_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed?.step > 1 || parsed?.mode) {
          setShowDraftModal(true);
          return;
        }
      } catch {}
    }

    // 캐시된 데이터로 즉시 열고, 백그라운드에서 갱신
    if (activeDebates.length > 0) {
      setShowSheet(true);
      markAsSeen();
      fetchActiveDebates(); // 백그라운드 갱신
      return;
    } else {
      // 캐시 없으면 한 번만 조회
      fetchActiveDebates().then((items) => {
        if (items.length > 0) {
          setShowSheet(true);
          markAsSeen();
        } else {
          navigate('/debate/create');
        }
      });
    }
  };

  const handleSelectDebate = (debate) => {
    setShowSheet(false);
    setIsEditing(false);
    setDeleting(null);
    const targetPath = getDebateRoute(debate, user.id);
    navigate(targetPath);
  };

const [showNewDebateWarningModal, setShowNewDebateWarningModal] = useState(false);

  const handleNewDebate = () => {
    // ✅ 논쟁 생성 페이지(Step 작성 중)이면 경고 모달
    if (isCreateActive) {
      setShowSheet(false);
      setShowNewDebateWarningModal(true);
      return;
    }
    setShowSheet(false);
    setIsEditing(false);
    setDeleting(null);
    navigate('/debate/create');
  };

  const menuItems = [
    { to: '/', icon: (active) => <HomeIcon active={active} /> },
    { to: '/debate/lobby', icon: (active) => <LiveIcon active={active} /> },
    { isButton: true, icon: (active, pulse) => <PlusIcon active={active} pulse={pulse} isDark={isDark} /> },
    { to: '/moragora', icon: (active) => <HallIcon active={active} /> },
    { to: '/profile', icon: (active) => <UserIcon active={active} /> }
  ];

  return (
    <>
    {/* ===== 논쟁 작성 중 드래프트 모달 ===== */}
    {showDraftModal && (
      <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center px-6">
        <div className="w-full max-w-sm bg-gradient-to-b from-[#F5F0E8] to-white rounded-2xl shadow-xl p-6">
          <p className="text-[15px] font-bold text-[#1B2A4A] mb-2">작성 중인 논쟁이 있습니다</p>
          <p className="text-[13px] text-[#1B2A4A]/50 leading-relaxed mb-6">
            이어서 작성하시겠습니까?<br />아니오를 선택하면 기존 내용이 삭제됩니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                localStorage.removeItem('debate_create_draft');
                setShowDraftModal(false);
                fetchActiveDebates().then((items) => {
                  if (items.length > 0) {
                    setShowSheet(true);
                    const currentIds = items.map(d => d.id).sort().join(',');
                    localStorage.setItem('tabbar_last_seen_ids', currentIds);
                    setHasNewActivity(false);
                  } else {
                    navigate('/debate/create');
                  }
                });
              }}
              className="flex-1 py-3 rounded-xl font-bold text-[14px] text-[#1B2A4A]/40 bg-white border-2 border-[#1B2A4A]/10 active:scale-95 transition-all"
            >
              아니오
            </button>
            <button
              onClick={() => {
                // 기존 드래프트 유지하고 이동
                setShowDraftModal(false);
                navigate('/debate/create');
              }}
              className="flex-1 py-3 rounded-xl font-bold text-[14px] bg-[#1B2A4A] text-[#D4AF37] border-2 border-[#D4AF37]/30 active:scale-95 transition-all"
            >
              이어서 작성
            </button>
          </div>
        </div>
      </div>
    )}
    {/* ===== 새 논쟁 경고 모달 (Step 작성 중) ===== */}
    {showNewDebateWarningModal && (
      <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center px-6">
        <div className="w-full max-w-sm bg-gradient-to-b from-[#F5F0E8] to-white rounded-2xl shadow-xl p-6">
          <p className="text-[15px] font-bold text-[#1B2A4A] mb-2">작성 중인 내용이 삭제됩니다</p>
          <p className="text-[13px] text-[#1B2A4A]/50 leading-relaxed mb-6">
            게임 모드 선택으로 돌아가면<br />Step1, 2, 3에서 작성한 내용이 모두 삭제됩니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewDebateWarningModal(false)}
              className="flex-1 py-3 rounded-xl font-bold text-[14px] text-[#1B2A4A]/40 bg-white border-2 border-[#1B2A4A]/10 active:scale-95 transition-all"
            >
              취소
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('debate_create_draft');
                setShowNewDebateWarningModal(false);
                setIsEditing(false);
                setDeleting(null);
                window.location.href = '/debate/create';
              }}
              className="flex-1 py-3 rounded-xl font-bold text-[14px] bg-[#1B2A4A] text-[#D4AF37] border-2 border-[#D4AF37]/30 active:scale-95 transition-all"
            >
              삭제 후 새 논쟁
            </button>
          </div>
        </div>
      </div>
    )}
      {/* ===== 바텀시트 오버레이 ===== */}
      {showSheet && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={(e) => { if (e.target === e.currentTarget) { setShowSheet(false); setIsEditing(false); setDeleting(null); } }}>
          <div
            ref={sheetRef}
            className="w-full max-w-[440px] bg-gradient-to-b from-[#F5F0E8] to-white rounded-t-2xl shadow-xl animate-slide-up pb-[env(safe-area-inset-bottom,0px)]"
          >
            {/* 핸들 — 드래그로 닫기 */}
            <div
              className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
              onTouchStart={(e) => { sheetRef.current._startY = e.touches[0].clientY; sheetRef.current._startTime = Date.now(); }}
              onTouchMove={(e) => {
                const dy = e.touches[0].clientY - sheetRef.current._startY;
                if (dy > 0) sheetRef.current.style.transform = `translateY(${dy * 0.85}px)`;
              }}
              onTouchEnd={(e) => {
                const dy = e.changedTouches[0].clientY - sheetRef.current._startY;
                const elapsed = Date.now() - sheetRef.current._startTime;
                const velocity = dy / Math.max(elapsed, 1);
                if (dy > 100 || velocity > 0.5) {
                  sheetRef.current.style.transition = 'transform 0.3s ease-out';
                  sheetRef.current.style.transform = 'translateY(110%)';
                  setTimeout(() => { setShowSheet(false); setIsEditing(false); setDeleting(null); }, 300);
                } else {
                  sheetRef.current.style.transition = 'transform 0.3s ease-out';
                  sheetRef.current.style.transform = 'translateY(0)';
                }
              }}
              onMouseDown={(e) => { sheetRef.current._startY = e.clientY; sheetRef.current._dragging = true; }}
              onMouseMove={(e) => {
                if (!sheetRef.current._dragging) return;
                const dy = e.clientY - sheetRef.current._startY;
                if (dy > 0) sheetRef.current.style.transform = `translateY(${dy * 0.85}px)`;
              }}
              onMouseUp={(e) => {
                if (!sheetRef.current._dragging) return;
                sheetRef.current._dragging = false;
                const dy = e.clientY - sheetRef.current._startY;
                if (dy > 100) {
                  sheetRef.current.style.transition = 'transform 0.3s ease-out';
                  sheetRef.current.style.transform = 'translateY(110%)';
                  setTimeout(() => { setShowSheet(false); setIsEditing(false); setDeleting(null); }, 300);
                } else {
                  sheetRef.current.style.transition = 'transform 0.3s ease-out';
                  sheetRef.current.style.transform = 'translateY(0)';
                }
              }}
            >
              <div className="w-10 h-1 rounded-full bg-[#1B2A4A]/15" />
            </div>

            {/* 헤더 */}
            <div className="px-5 pt-2 pb-3 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#1B2A4A]/35">진행중인 논쟁</p>
              {activeDebates.length > 0 && (
                <button
                  onClick={() => { setIsEditing(!isEditing); setDeleting(null); }}
                  className="text-[13px] font-bold text-[#007AFF] active:opacity-30 transition-opacity"
                >
                  {isEditing ? '완료' : '편집'}
                </button>
              )}
            </div>

            {/* 진행중 논쟁 목록 */}
            <div ref={listRef} onScroll={handleScroll} className="px-5 pb-3 space-y-2 max-h-[40vh] overflow-y-auto">
              {activeDebates.map((debate) => {
                const info = getStatusLabel(debate);
                const isDeleting = deleting === debate.id;
                return (
                  <div
                    key={debate.id}
                    className="w-full flex items-center gap-2 transition-all"
                  >
                  <button
                    onClick={() => !isEditing && handleSelectDebate(debate)}
                    className={`flex-1 min-w-0 flex items-center justify-between p-3 rounded-2xl bg-white border-2 text-left transition-all ${
                      isDeleting ? 'border-[#FF3B30]/20 bg-red-50/30' : 'border-[#1B2A4A]/5 active:scale-[0.98]'
                    } ${isEditing ? 'cursor-default' : ''}`}
                  >
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-[#1B2A4A] truncate">{debate.topic}</p>
                        <span className={`text-[11px] font-bold ${isDeleting ? 'text-[#FF3B30]' : info.color}`}>
                          {isDeleting ? '한 번 더 누르면 삭제됩니다' : info.label}
                        </span>
                      </div>
                      <div className="flex items-center shrink-0 ml-2">
                        <AnimatePresence mode="wait">
                          {isEditing ? (
                            <motion.button
                              key="delete-btn"
                              initial={{ opacity: 0, scale: 0.8, x: 10 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.8, x: 10 }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!isDeleting) { setDeleting(debate.id); return; }
                                try {
                                  await deleteDebate(debate.id);
                                  setActiveDebates(prev => prev.filter(d => d.id !== debate.id));
                                  setDeleting(null);
                                } catch (err) {
                                  showModal('error', '삭제에 실패했습니다', '잠시 후 다시 시도해주세요.');
                                  setDeleting(null);
                                }
                              }}
                              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90 ${
                                isDeleting ? 'bg-[#FF3B30] text-white' : 'bg-red-50 text-[#FF3B30]'
                              }`}
                            >
                              <Trash2 size={18} strokeWidth={2.5} />
                            </motion.button>
                          ) : (
                            <motion.div
                              key="arrow"
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -5 }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="9 6 15 12 9 18"/>
                              </svg>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
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
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-sans font-bold text-[14px] bg-[#1B2A4A] text-[#D4AF37] border-2 border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-[#1B2A4A] active:scale-95 transition-all duration-300 shadow-md"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
                </svg>
                새 논쟁
              </button>
              <button
                onClick={() => { setShowSheet(false); setIsEditing(false); setDeleting(null); }}
                className="flex-1 py-3 rounded-xl font-sans font-bold text-[14px] text-[#1B2A4A]/40 bg-white border-2 border-[#1B2A4A]/10 hover:border-[#1B2A4A]/20 active:scale-95 transition-all duration-300"
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
                  {item.icon(isCreateActive, hasNewActivity && !isCreateActive)}
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
        @keyframes stroke-pulse-dark {
          0%, 100% { stroke: #D4AF37; opacity: 0.3; }
          50% { stroke: #D4AF37; opacity: 1; }
        }
        .animate-stroke-pulse-dark {
          animation: stroke-pulse-dark 2s ease-in-out infinite;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>

      <MoragoraModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        onConfirm={modal.onConfirm ? () => { modal.onConfirm(); closeModal(); } : undefined}
      />
    </>
  );
}
