import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import useThemeStore from '../../store/useThemeStore';
import { formatDate } from '../../utils/dateFormatter';
import QuoteLoader from '../../components/common/QuoteLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import api from '../../services/api';
import { resolveAvatar } from '../../utils/avatar';
import {
  Gavel, Scale, User, Trophy, Info, ChevronRight, FileText, Crown, Sparkles, X, History, MessageSquarePlus, Plus
} from 'lucide-react';

const TIER_LIST = [
  { name: '시민', en: 'CITIZEN', min: 0, max: 299, icon: User, color: '#8E8E93', bg: '#F5F5F7', desc: '논쟁의 첫 발걸음' },
  { name: '배심원', en: 'JUROR', min: 300, max: 1000, icon: Gavel, color: '#007AFF', bg: '#EBF5FF', desc: '공정한 시각으로 논쟁을 바라보는 자' },
  { name: '변호사', en: 'ATTORNEY', min: 1001, max: 2000, icon: FileText, color: '#AF52DE', bg: '#F9F0FF', desc: '탄탄한 논거로 상대를 압박하는 자' },
  { name: '판사', en: 'JUDGE', min: 2001, max: 5000, icon: Scale, color: '#FF9500', bg: '#FFF5EB', desc: '논리와 이성으로 판단을 내리는 자' },
  { name: '대법관', en: 'SUPREME', min: 5001, max: null, icon: Crown, color: '#FF3B30', bg: '#FFF0EF', desc: '서버 최강의 논쟁 지배자' },
];

const categoryMap = {
  daily: '일상', romance: '연애', work: '직장', education: '교육',
  social: '사회', politics: '정치', technology: '기술', philosophy: '철학',
  culture: '문화', 일상: '일상', 연애: '연애', 직장: '직장', 교육: '교육',
  사회: '사회', 정치: '정치', 기술: '기술', 철학: '철학', 문화: '문화', 기타: '기타',
};


const findTierByScore = (score) => {
  const pts = score || 0;
  for (let i = TIER_LIST.length - 1; i >= 0; i--) {
    if (pts >= TIER_LIST[i].min) return TIER_LIST[i];
  }
  return TIER_LIST[0];
};

// ─── CountUp 컴포넌트 ──────────────────────────────────────────────────────────
function CountUp({ end, separator = ',' }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const step = 16;
    const increment = end / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, step);
    return () => clearInterval(timer);
  }, [end]);
  return <>{separator ? count.toLocaleString() : count}</>;
}

// ─── Reusable iOS BottomSheet ─────────────────────────────────────────────────
function BottomSheet({ isOpen, onClose, children, maxHeight = '80vh', bgColor = '#F2F2F7', zIndex = 100 }) {
  const sheetRef = useRef(null);
  const startYRef = useRef(null);
  const currentYRef = useRef(0);
  const startTimeRef = useRef(null);
  const isDraggingHandle = useRef(false);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    const preventTouch = (e) => {
      if (sheetRef.current && sheetRef.current.contains(e.target)) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventTouch, { passive: false });
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
      document.removeEventListener('touchmove', preventTouch, { passive: false });
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && sheetRef.current) {
      sheetRef.current.style.transform = 'translateY(0px)';
      sheetRef.current.style.transition = '';
    }
  }, [isOpen]);

  const applyDrag = useCallback((deltaY) => {
    if (!sheetRef.current) return;
    const clamped = Math.max(0, deltaY);
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'none';
        sheetRef.current.style.transform = `translateY(${clamped * 0.85}px)`;
      }
    });
  }, []);

  const handlePointerDown = useCallback((e) => {
    isDraggingHandle.current = true;
    startYRef.current = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    startTimeRef.current = Date.now();
    currentYRef.current = 0;
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDraggingHandle.current || startYRef.current === null) return;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    currentYRef.current = clientY - startYRef.current;
    applyDrag(currentYRef.current);
  }, [applyDrag]);

  const handlePointerUp = useCallback(() => {
    if (!isDraggingHandle.current) return;
    isDraggingHandle.current = false;
    const deltaY = currentYRef.current;
    const elapsed = Date.now() - startTimeRef.current;
    const velocity = deltaY / Math.max(elapsed, 1);
    const shouldDismiss = deltaY > 120 || velocity > 0.5;
    if (shouldDismiss) {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.32s cubic-bezier(0.32, 0, 0.67, 0)';
        sheetRef.current.style.transform = 'translateY(110%)';
      }
      setTimeout(onClose, 320);
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        sheetRef.current.style.transform = 'translateY(0px)';
      }
    }
    startYRef.current = null;
    currentYRef.current = 0;
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex }}
          />
          <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none" style={{ zIndex: zIndex + 1 }}>
            <motion.div
              ref={sheetRef}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '110%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 240, mass: 0.9 }}
              className="w-full max-w-[440px] rounded-t-[32px] flex flex-col shadow-2xl overflow-hidden pointer-events-auto"
              style={{ backgroundColor: bgColor, maxHeight }}
            >
              {/* Handle + X */}
              <div
                className="relative flex items-center justify-center px-5 pt-4 pb-3 flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              >
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.18)' }} />
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onClose}
                  className="absolute right-4 top-8 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
                >
                  <X size={16} strokeWidth={2.5} style={{ color: 'rgba(0,0,0,0.45)' }} />
                </button>
              </div>
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── PlayerProfileSheet ───────────────────────────────────────────────────────
function PlayerProfileSheet({ player, rank, onClose, isDark }) {
  const [debates, setDebates] = useState([]);
  const [loadingDebates, setLoadingDebates] = useState(true);
  const [visibleDebatesCount, setVisibleDebatesCount] = useState(5);

  const tier = findTierByScore(player?.total_score);
  const wins = player?.wins || 0;
  const losses = player?.losses || 0;
  const draws = player?.draws || 0;
  const totalForRate = wins + losses;
  const totalGames = wins + losses + draws;
  const winRate = totalForRate > 0 ? (wins / totalForRate) * 100 : 0;

  const currentScore = player?.total_score || 0;
  const nextTier = TIER_LIST[TIER_LIST.indexOf(tier) + 1] || null;
  const progress = nextTier
    ? Math.min(100, Math.round(((currentScore - tier.min) / (nextTier.min - tier.min)) * 100))
    : 100;

  useEffect(() => {
    if (!player?.id) return;
    const fetchDebates = async () => {
      setLoadingDebates(true);
      try {
        const { data, error } = await supabase
          .from('debates')
          .select(`*, verdicts (*)`)
          .or(`creator_id.eq.${player.id},opponent_id.eq.${player.id}`)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        setDebates(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDebates(false);
      }
    };
    fetchDebates();
  }, [player?.id]);

  const getResult = (debate) => {
    const verdict = debate.verdicts?.[0];
    if (!verdict) return null;
    const isCreator = debate.creator_id === player.id;
    const mySide = isCreator ? 'A' : 'B';
    if (verdict.winner_side === 'draw') return '무승부';
    return verdict.winner_side === mySide ? '승리' : '패배';
  };

  const currentDebates = debates.slice(0, visibleDebatesCount);

  return (
    <BottomSheet isOpen onClose={onClose} maxHeight="80vh" bgColor={isDark ? '#0f1419' : '#F2F2F7'} zIndex={100}>
      <div className="px-5 pb-32 overflow-y-auto flex-1 overscroll-contain">

        {/* 프로필 헤더 */}
        <div className="flex items-center gap-4 mb-6 pt-2">
          <div className="relative">
            <div className="w-24 h-24 rounded-[24px] overflow-hidden border-2 shadow-lg" style={{ borderColor: tier.color }}>
              <img
                src={resolveAvatar(player.avatar_url, player.id, player.gender)}
                alt="avatar" className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-[16px] font-black text-white shadow-md" style={{ backgroundColor: tier.color }}>
              #{rank}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[24px] font-black text-black">{player.nickname}</h2>
              <span className="text-[16px] font-black px-3 py-1 rounded-md text-white flex items-center gap-1" style={{ backgroundColor: tier.color }}>
                <tier.icon size={14} /> {tier.name}
              </span>
            </div>
            <p className="text-[18px] font-bold" style={{ color: tier.color }}>
              {player.total_score?.toLocaleString()} XP
            </p>
          </div>
        </div>

        {/* ── 새 디자인: 포인트/티어 + 승률 카드 ── */}
        <div className="space-y-4 mb-6">

          {/* 1. 포인트 & 티어 진행도 카드 (마이페이지 통일) */}
          <div className="relative bg-white/60 dark:bg-white/[0.04] backdrop-blur-2xl rounded-[32px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.03)] border border-white/80 dark:border-white/[0.06] overflow-hidden active:scale-[0.98] transition-transform">
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-5">
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[32px] font-black text-gray-900 dark:text-white tracking-tighter">
                      <CountUp end={currentScore} separator="," />
                    </span>
                    <span className="text-[14px] font-bold text-gray-400 dark:text-white/40">P</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-white dark:bg-white/10 rounded-2xl shadow-sm border border-gray-50 dark:border-white/10 flex items-center justify-center">
                  <tier.icon size={24} style={{ color: tier.color }} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end px-1">
                  <span className="text-[14px] font-heavy tracking-tight" style={{ color: tier.color }}>{tier.name}</span>
                </div>

                <div className="relative w-full">
                  <div className="w-full h-3.5 bg-gray-200/50 dark:bg-white/10 rounded-full overflow-hidden border border-white/40 dark:border-white/5 relative p-[1px]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1.5, ease: 'circOut' }}
                      className="h-full rounded-full relative"
                      style={{ background: 'linear-gradient(to right, #FFD500, #FFAB00)', boxShadow: '0 1px 3px rgba(255, 171, 0, 0.3)' }}
                    >
                      <div className="absolute top-0 left-0 w-full h-[35%] bg-white/40 rounded-full" />
                    </motion.div>
                  </div>
                  <div className="mt-2.5 flex justify-between items-center px-1">
                    <span className="text-[13px] font-black text-gray-500 dark:text-white/50 tracking-tighter">
                      {progress.toFixed ? progress.toFixed(2) : progress}%
                    </span>
                    <span className="text-[11px] font-bold text-gray-400 dark:text-white/30 tracking-tight">
                      {currentScore.toLocaleString()} <span className="text-gray-600 dark:text-white/20">/</span> {nextTier ? nextTier.min.toLocaleString() : 'MAX'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 승률 스코어보드 카드 (마이페이지 통일) */}
          <div className="bg-white/60 dark:bg-white/[0.04] backdrop-blur-2xl rounded-[32px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.03)] border border-white/80 dark:border-white/[0.06] active:scale-[0.98] transition-transform">

            <div className="flex justify-between items-center mb-8">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
                  <span className="text-[16px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">전적</span>
                </div>
                <div className="flex items-baseline leading-none">
                  <span className="text-[32px] font-black text-gray-900 dark:text-white tracking-tighter">
                    {winRate.toFixed(1)}
                  </span>
                  <span className="text-[20px] font-bold text-blue-500 ml-1">%</span>
                </div>
              </div>

              <div className="bg-gray-50/80 dark:bg-white/[0.06] px-4 py-2.5 rounded-2xl border border-gray-100/50 dark:border-white/[0.06] text-center">
                <p className="text-[12px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest mt-1">Total</p>
                <p className="text-[22px] font-black text-gray-900 dark:text-[#D4AF37] leading-none">{totalGames}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '승리', value: wins, textColor: 'text-blue-600', bg: 'bg-blue-50/40 dark:bg-blue-500/10', border: 'border-blue-100/50 dark:border-blue-500/20' },
                { label: '무승부', value: draws, textColor: 'text-gray-500 dark:text-white/50', bg: 'bg-gray-50/60 dark:bg-white/[0.04]', border: 'border-gray-200/50 dark:border-white/10' },
                { label: '패배', value: losses, textColor: 'text-red-600', bg: 'bg-red-50/40 dark:bg-red-500/10', border: 'border-red-100/50 dark:border-red-500/20' },
              ].map((item, i) => (
                <div key={i} className={`${item.bg} ${item.border} rounded-[24px] py-4 flex flex-col items-center border shadow-[0_4px_12px_rgba(0,0,0,0.01)]`}>
                  <span className={`text-[24px] font-black ${item.textColor} tracking-tight leading-none`}>
                    {item.value}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-white/30 mt-2">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 논쟁 리스트 */}
        <div className="flex items-center gap-2 mb-4 ml-1">
          <History size={18} className="text-[#8E8E93]" />
          <h3 className="text-[16px] font-bold text-[#8E8E93] uppercase tracking-wider">최근 논쟁 리스트</h3>
        </div>

        {loadingDebates ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-[#1B2A4A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : debates.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <MessageSquarePlus size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-[17px] font-bold text-gray-400">아직 참여한 논쟁이 없어요</p>
          </div>
        ) : (
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              {currentDebates.map((debate) => {
                const result = getResult(debate);
                const category = categoryMap[debate.category?.toLowerCase()] || categoryMap[debate.category] || debate.category || '기타';
                return (
                  <div key={debate.id} className="p-5 flex items-center justify-between active:bg-gray-50 transition-colors">
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        {result && (
                          <span className={`text-[14px] px-2 py-0.5 rounded-md font-black ${
                            result === '승리' ? 'bg-blue-50 text-[#007AFF]'
                            : result === '패배' ? 'bg-red-50 text-[#FF3B30]'
                            : 'bg-gray-100 text-[#8E8E93]'
                          }`}>
                            {result}
                          </span>
                        )}
                        <span className="text-[14px] text-gray-400 font-medium">{formatDate(debate.created_at)}</span>
                      </div>
                      <h4 className="text-[17px] font-bold text-black line-clamp-1">{debate.topic}</h4>
                    </div>
                    <span className="text-[14px] font-semibold text-gray-300 flex-shrink-0">{category}</span>
                  </div>
                );
              })}
            </div>
            {visibleDebatesCount < debates.length && (
              <button
                onClick={() => setVisibleDebatesCount(v => v + 5)}
                className="w-full py-4 mt-3 bg-white rounded-xl border border-gray-100 text-[15px] font-bold text-gray-400 flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
              >
                <Plus size={16} /> 더보기
              </button>
            )}
          </div>
        )}
        <div className="h-10" />
      </div>
    </BottomSheet>
  );
}

// ─── RankingPage ──────────────────────────────────────────────────────────────
export default function RankingPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';
  const isDark = useThemeStore(s => s.isDark);
  const [isTierSheetOpen, setIsTierSheetOpen] = useState(false);
  const [isHallInfoOpen, setIsHallInfoOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('user'); // 'user' | 'debate'
  const [hallData, setHallData] = useState([]);
  const [hallLoading, setHallLoading] = useState(false);
  const [hallVisible, setHallVisible] = useState(10);
  const [hallLoadingMore, setHallLoadingMore] = useState(false);

  // stale-while-revalidate: 캐시 즉시 → 백그라운드 갱신
  useEffect(() => {
    let hasCached = false;
    try {
      const cached = JSON.parse(sessionStorage.getItem('ranking_cache'));
      if (cached) { setRankings(cached); setIsLoading(false); hasCached = true; }
    } catch {}
    const fetchRankings = async () => {
      if (!hasCached) setIsLoading(true);
      try {
        const res = await api.get('/profiles/ranking');
        setRankings(res);
        sessionStorage.setItem('ranking_cache', JSON.stringify(res));
      } catch (err) {
        console.error('랭킹 불러오기 실패:', err);
      } finally { setIsLoading(false); }
    };
    fetchRankings();
  }, []);

  useEffect(() => {
    if (activeTab !== 'debate') return;
    let hasCached = false;
    try {
      const cached = JSON.parse(sessionStorage.getItem('hall_cache'));
      if (cached) { setHallData(cached); setHallLoading(false); hasCached = true; }
    } catch {}
    const fetchHall = async () => {
      if (!hasCached) setHallLoading(true);
      try {
        const res = await api.get('/judgments/hall?limit=20');
        setHallData(res);
        sessionStorage.setItem('hall_cache', JSON.stringify(res));
      } catch (err) {
        console.error('명예의 전당 불러오기 실패:', err);
      } finally { setHallLoading(false); }
    };
    fetchHall();
  }, [activeTab]);

  const myRankIndex = rankings.findIndex(r => r.id === user?.id);
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : '-';
  const myData = myRankIndex !== -1 ? rankings[myRankIndex] : null;
  const currentTier = findTierByScore(myData?.total_score);
  const filteredRankings = searchQuery
    ? rankings.filter(r => (r.nickname || '').toLowerCase().includes(searchQuery))
    : rankings;
  const podiumData = (searchQuery ? [] : rankings.slice(0, 3)).map((r, idx) => ({
    ...r,
    rank: idx + 1,
    tierData: findTierByScore(r.total_score),
    color: idx === 0 ? 'from-[#FFD700] to-[#FF9500]' : idx === 1 ? 'from-[#C0C0C0] to-[#8E8E93]' : 'from-[#CD7F32] to-[#A2845E]',
    trophyColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32',
    podiumBg: isDark
      ? (idx === 0 ? 'bg-gradient-to-b from-[#2a2a1a] to-[#1a1a10]' : idx === 1 ? 'bg-gradient-to-b from-[#252530] to-[#1a1a22]' : 'bg-gradient-to-b from-[#2a2218] to-[#1a1810]')
      : (idx === 0 ? 'bg-gradient-to-b from-white to-[#FFF9E5]' : idx === 1 ? 'bg-gradient-to-b from-white to-[#F5F5F7]' : 'bg-gradient-to-b from-white to-[#FAF5F0]'),
  }));
  const top10List = searchQuery ? filteredRankings : rankings.slice(3, 10);
  const myIsOutsideTop10 = myRankIndex >= 10;

  return (
    <div className="min-h-screen bg-[#F3F1EC] font-sans">
      <div className="max-w-md mx-auto px-5 pt-6 pb-32">
        {isLoading ? (
          <QuoteLoader />
        ) : (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-[24px] font-black text-[#1B2A4A]">명예의 전당</h1>
                <button
                  onClick={() => activeTab === 'user' ? setIsTierSheetOpen(true) : setIsHallInfoOpen(true)}
                  className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-[#1B2A4A]/40 active:scale-90 transition-all"
                >
                  <Info size={20} />
                </button>
              </div>
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab('user')}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${
                    activeTab === 'user' ? 'bg-white text-[#1B2A4A] shadow-sm' : 'text-[#1B2A4A]/40'
                  }`}
                >유저 랭킹</button>
                <button
                  onClick={() => setActiveTab('debate')}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${
                    activeTab === 'debate' ? 'bg-white text-[#1B2A4A] shadow-sm' : 'text-[#1B2A4A]/40'
                  }`}
                >논쟁 랭킹</button>
              </div>
            </div>

                  
           {/* ===== 논쟁 랭킹 탭 (Clean Mono AI & Views Fixed) ===== */}
{activeTab === 'debate' && (
  <div className="px-4 pb-24 min-h-screen font-[-apple-system,sans-serif] tracking-tight antialiased">
    {hallLoading ? (
      <QuoteLoader />
    ) : (
      <div className="max-w-[440px] mx-auto pt-6 flex flex-col gap-3">
        {hallData.slice(0, hallVisible).map((v, idx) => {
          const d = v.debate || {};
          const creator = d.creator || {};
          const rank = idx + 1;
          
          // 티어 색상 (배지에만 사용)
          const getTierColor = (tierName) => {
            switch(tierName) {
              case '변호사': return '#A855F7';
              case '검사': return '#EF4444';
              case '판사': return '#D4AF37';
              case '배심원': return '#3B82F6';
              default: return '#8E8E93';
            }
          };
          const tierColor = getTierColor(creator.tier);

          const winLabel = v.winner_side === 'A' ? 'A측 승리' : v.winner_side === 'B' ? 'B측 승리' : '무승부';
          const winColor = v.winner_side === 'A' ? '#34C759' : v.winner_side === 'B' ? '#FF3B30' : '#8E8E93';

          return (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => window.location.href = `/moragora/${d.id}`}
              className={`relative rounded-[24px] p-4 border-[1.5px] bg-white transition-all active:scale-[0.98] cursor-pointer 
                ${rank === 1 ? "border-[#FFD60A] shadow-[0_8px_20px_rgba(255,214,10,0.12)]" : "border-white shadow-[0_2px_8px_rgba(0,0,0,0.02)]"}`}
            >
              <div className="flex gap-3.5">
                {/* [좌측] 순위 배지 */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[16px] font-[1000] italic shadow-inner
                    ${rank === 1 ? "bg-[#FFD60A] text-[#8A6600]" : rank === 2 ? "bg-[#D1D1D6] text-white" : rank === 3 ? "bg-[#C1A47E] text-white" : "bg-[#F2F2F7] text-[#AEAEB2]"}`}>
                    {rank}
                  </div>
                </div>

                {/* [우측] 콘텐츠 */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img 
                        src={resolveAvatar(creator.avatar_url, creator.id || d.creator_id, creator.gender)} 
                        className="w-5 h-5 rounded-full object-cover border border-gray-100" 
                        alt="" 
                      />
                      <span className="text-[14px] font-[600] text-[#1C1C1E] truncate max-w-[100px] leading-none">
                        {creator.nickname || '익명'}
                      </span>
                      {creator.tier && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-[4px] text-white uppercase tracking-tighter scale-95"
                              style={{ backgroundColor: tierColor }}>
                          {creator.tier}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F2F2F7]" style={{ color: winColor }}>
                      {winLabel}
                    </span>
                  </div>

                  <h3 className="text-[13px] text-[#4e4e4e] leading-snug line-clamp-1 mt-3 mb-3.5 tracking-tight">
                    {d.topic}
                  </h3>

                  {/* 하단: 통계(조회수 복구) & AI 점수(단색화) */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#F2F2F7]">
                    <div className="flex items-center gap-3.5 text-gray-400">
                      {/* 좋아요 */}
                      <div className="flex items-center gap-1">
                        <svg fill="none" stroke="#8E8E93" strokeWidth="2.5" height="12" viewBox="0 0 24 24" width="12" className="opacity-50">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span className={`text-[10px] font-medium ${isDark ? 'text-[#b0aaa0]' : 'text-[#AEAEB2]'}`}>{v._likes || 0}</span>
                      </div>
                      {/* 댓글 */}
                      <div className="flex items-center gap-1">
                        <svg fill="none" stroke="#8E8E93" strokeWidth="2.5" height="12" viewBox="0 0 24 24" width="12" className="opacity-50">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        </svg>
                        <span className={`text-[10px] font-medium ${isDark ? 'text-[#b0aaa0]' : 'text-[#AEAEB2]'}`}>{v._comments || 0}</span>
                      </div>
                      {/* 조회수 */}
                      <div className="flex items-center gap-1">
                        <svg fill="none" stroke="#8E8E93" strokeWidth="2.5" height="12" viewBox="0 0 24 24" width="12" className="opacity-50">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        <span className={`text-[10px] font-medium ${isDark ? 'text-[#b0aaa0]' : 'text-[#AEAEB2]'}`}>{v._views || 0}</span>
                      </div>
                    </div>
                    
                    {/* [단색화] AI Score (깔끔한 그레이 & 블루 포인트) */}
                    <div className="flex items-center gap-1.5 bg-[#F2F2F7] px-2.5 py-1 rounded-[10px] border border-gray-100/50">
                      <span className="text-[10px] font-black text-[#8E8E93] tracking-tighter uppercase leading-none">AI점수</span>
                      <span className="text-[12px] font-[600] text-[#007AFF] leading-none">
                        {v._aiScore || ((v.ai_score_a || 0) + (v.ai_score_b || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* 무한 스크롤 트리거 */}
        {hallVisible < hallData.length && (
          <div ref={el => {
            if (!el) return;
            const observer = new IntersectionObserver(([entry]) => {
              if (entry.isIntersecting && !hallLoadingMore) {
                setHallLoadingMore(true);
                setTimeout(() => {
                  setHallVisible(prev => prev + 5);
                  setHallLoadingMore(false);
                }, 400);
              }
            }, { threshold: 0.1 });
            observer.observe(el);
            return () => observer.disconnect();
          }} className="flex justify-center py-6">
            <div className="w-6 h-6 border-3 border-[#1B2A4A]/20 border-t-[#1B2A4A] rounded-full animate-spin" />
          </div>
        )}
      </div>
    )}
  </div>
)}

            {/* ===== 유저 랭킹 탭 ===== */}
            {activeTab === 'user' && <>
            {/* Podium */}
            {podiumData.length >= 3 && (
              <div className="flex justify-center items-end gap-2 h-[380px] mb-8 pt-6">
                {[1, 0, 2].map((idx) => {
                  const p = podiumData[idx];
                  if (!p) return null;
                  const isFirst = idx === 0;
                  const isPodiumMe = user && p.id === user.id;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex-1 flex flex-col items-center cursor-pointer"
                      onClick={() => setSelectedPlayer({ player: p, rank: p.rank })}
                    >
                      <div className="relative mb-3">
                        <motion.div
                          animate={{ y: [0, -6, 0], rotate: isFirst ? [-3, 3, -3] : 0 }}
                          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                          className="relative z-10"
                        >
                          <Trophy size={isFirst ? 40 : 28} fill={p.trophyColor} color={p.trophyColor} className="drop-shadow-md" />
                          <Sparkles className="absolute -top-2 -right-2 w-4 h-4" style={{ color: p.trophyColor, opacity: 0.7 }} />
                        </motion.div>
                        <motion.div
                          animate={{ opacity: [0.15, 0.4, 0.15], scale: [0.8, 1.1, 0.8] }}
                          transition={{ repeat: Infinity, duration: 2.5 }}
                          className="absolute inset-0 blur-xl rounded-full -z-10"
                          style={{ backgroundColor: p.trophyColor }}
                        />
                      </div>
                      <div className="relative mb-4">
                        <div className={`rounded-full p-0.5 bg-gradient-to-tr ${p.color} shadow-lg ${isPodiumMe ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
                          <div className="rounded-full bg-white p-0.5">
                            <div className={`rounded-full overflow-hidden ${isFirst ? 'w-20 h-20' : 'w-16 h-16'} bg-gray-50`}>
                              <img src={resolveAvatar(p.avatar_url, p.id, p.gender)} alt="avatar" className="w-full h-full object-cover" />
                            </div>
                          </div>
                        </div>
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-white w-7 h-7 flex items-center justify-center rounded-full shadow-md border border-gray-100 text-[14px] font-black" style={{ color: p.trophyColor }}>
                          {p.rank}
                        </div>
                      </div>
                      <div className={`w-full ${isFirst ? 'h-40' : idx === 1 ? 'h-32' : 'h-28'} rounded-t-[24px] relative overflow-hidden flex flex-col items-center justify-start pt-4 shadow-md border border-gray-100 ${p.podiumBg}`}>
                        <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${p.color}`} />
                        <p className={`text-[14px] font-black mb-0.5 truncate px-2 ${isPodiumMe ? 'text-[#007AFF]' : 'text-gray-800'}`}>{p.nickname}</p>
                        <p className="text-[13px] font-black text-[#D4AF37]">{p.total_score?.toLocaleString()} XP</p>
                        <div className="mt-2 px-3 py-1 bg-black/5 rounded-full text-[11px] font-black text-gray-400">
                          {p.wins}승 {p.losses}패
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* My rank card */}
            {!isLoading && myData && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="mb-8 bg-white rounded-2xl p-4 shadow-sm border relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
                style={{ borderColor: `${currentTier.color}40` }}
                onClick={() => setSelectedPlayer({ player: myData, rank: myRank })}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <span className="text-[24px] font-black italic min-w-[32px] text-center" style={{ color: currentTier.color }}>{myRank}</span>
                  <div className="w-12 h-12 rounded-xl bg-gray-50 overflow-hidden border border-gray-100 flex-shrink-0">
                    <img src={resolveAvatar(myData?.avatar_url, myData?.id, myData?.gender)} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-black text-black truncate">{myData?.nickname}</span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: currentTier.color }}>{currentTier.name}</span>
                    </div>
                    <p className="text-[12px] font-bold text-gray-400">
                      {myData.wins}승 {myData.losses}패 · <span style={{ color: currentTier.color }}>{myData.total_score?.toLocaleString()} XP</span>
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-gray-200 flex-shrink-0" />
                </div>
              </motion.div>
            )}

            {/* Rankings list */}
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="w-1 h-5 bg-[#D4AF37] rounded-full" />
              <h3 className="text-[16px] font-black text-[#1B2A4A]">전체 랭킹</h3>
            </div>
            <div className="space-y-3">
              {top10List.map((player, idx) => {
                const rank = idx + 4;
                const isListMe = user && player.id === user.id;
                const playerTier = findTierByScore(player.total_score);
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => setSelectedPlayer({ player, rank })}
                    className="rounded-2xl p-4 flex items-center transition-all cursor-pointer active:scale-[0.98]"
                    style={{
                      borderWidth: isListMe ? 2 : 1,
                      borderStyle: 'solid',
                      borderColor: isListMe ? playerTier.color : (isDark ? '#2a3545' : '#F3F4F6'),
                      backgroundColor: isListMe ? `${playerTier.color}08` : (isDark ? '#1a2332' : 'white'),
                      boxShadow: isListMe ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div className="w-9 flex items-center justify-center mr-3">
                      <span className="text-[18px] font-black italic" style={{ color: isListMe ? playerTier.color : (isDark ? 'rgba(224,221,213,0.2)' : 'rgba(0,0,0,0.15)') }}>{rank}</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gray-50 overflow-hidden mr-3 flex-shrink-0">
                      <img src={resolveAvatar(player.avatar_url, player.id, player.gender)} alt="avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-bold truncate" style={{ color: isListMe ? playerTier.color : (isDark ? '#e0ddd5' : 'black') }}>{player.nickname}</span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded text-white flex-shrink-0" style={{ backgroundColor: playerTier.color }}>{playerTier.name}</span>
                      </div>
                      <div className="text-[12px] font-bold text-gray-400">{player.wins}승 {player.losses}패 · {player.total_score?.toLocaleString()} XP</div>
                    </div>
                    <ChevronRight className="w-5 h-5 flex-shrink-0 text-gray-200" />
                  </motion.div>
                );
              })}

              {myIsOutsideTop10 && myData && (
                <>
                  <div className="flex items-center justify-center py-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1B2A4A]/15" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1B2A4A]/15" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1B2A4A]/15" />
                    </div>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedPlayer({ player: myData, rank: myRankIndex + 1 })}
                    className="rounded-2xl p-4 flex items-center cursor-pointer active:scale-[0.98] border-2 shadow-md"
                    style={{ borderColor: currentTier.color, backgroundColor: `${currentTier.color}08` }}
                  >
                    <div className="w-9 flex items-center justify-center mr-3">
                      <span className="text-[18px] font-black italic" style={{ color: currentTier.color }}>{myRankIndex + 1}</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gray-50 overflow-hidden mr-3 flex-shrink-0">
                      <img src={resolveAvatar(myData.avatar_url, myData.id, myData.gender)} alt="avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-bold truncate" style={{ color: currentTier.color }}>{myData.nickname}</span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded text-white flex-shrink-0" style={{ backgroundColor: currentTier.color }}>{currentTier.name}</span>
                      </div>
                      <div className="text-[12px] font-bold text-gray-400">{myData.wins}승 {myData.losses}패 · {myData.total_score?.toLocaleString()} XP</div>
                    </div>
                    <ChevronRight className="w-5 h-5 flex-shrink-0 text-gray-200" />
                  </motion.div>
                </>
              )}
            </div>
          </>}
          </>
        )}
      </div>

      {/* 등급 시스템 바텀시트 */}
      <BottomSheet isOpen={isTierSheetOpen} onClose={() => setIsTierSheetOpen(false)} maxHeight="88vh" bgColor={isDark ? '#0f1419' : '#F2F2F7'} zIndex={100}>
        <div className="px-5 overflow-y-auto flex-1 overscroll-contain pb-12">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-[16px] font-bold text-gray-400 uppercase tracking-widest mb-1">Point System</p>
              <h3 className="text-[28px] font-black text-black">등급 시스템</h3>
            </div>
            <div className="flex flex-col items-center px-4 py-3 rounded-2xl mt-5" style={{ backgroundColor: isDark ? `${currentTier.color}15` : currentTier.bg }}>
              <currentTier.icon size={32} style={{ color: currentTier.color, opacity: isDark ? 0.7 : 1 }} />
              <span className="text-[16px] font-black mt-2" style={{ color: currentTier.color, opacity: isDark ? 0.7 : 1 }}>{currentTier.name}</span>
            </div>
          </div>
          <div className="space-y-4 mb-10">
            {[...TIER_LIST].reverse().map((t, i) => {
              const isCurrent = t.name === currentTier.name;
              return (
                <motion.div key={t.name}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-2xl p-5 flex items-center gap-4 border-2 transition-all shadow-sm ${!isCurrent ? 'bg-white' : ''}`}
                  style={{ backgroundColor: isCurrent ? (isDark ? `${t.color}15` : t.bg) : undefined, borderColor: isCurrent ? t.color : (isDark ? '#2a3545' : 'transparent') }}
                >
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: isDark ? `${t.color}20` : t.bg }}>
                    <t.icon size={32} style={{ color: t.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[18px] font-black" style={{ color: t.color }}>{t.name}</span>
                      <span className="text-[16px] text-gray-300 font-bold">{t.en}</span>
                      {isCurrent && <span className="text-[16px] font-black px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: t.color }}>현재</span>}
                    </div>
                    <p className="text-[16px] text-gray-400 font-medium leading-tight">{t.desc}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[16px] font-black" style={{ color: t.color }}>{t.min.toLocaleString()}{t.max ? ` ~ ${t.max.toLocaleString()}` : '+'}</p>
                    <p className="text-[16px] text-gray-300 font-bold">포인트</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <button onClick={() => setIsTierSheetOpen(false)} className="w-full py-5 bg-black text-white font-black rounded-2xl text-[18px] active:scale-95 transition-all shadow-lg">확인</button>
        </div>
      </BottomSheet>

      {/* ─── 논쟁 랭킹 점수 산정 기준 바텀시트 ──────────────────── */}
      <BottomSheet isOpen={isHallInfoOpen} onClose={() => setIsHallInfoOpen(false)} maxHeight="80vh" bgColor={isDark ? '#0f1419' : '#F2F2F7'} zIndex={100}>
        <div className="px-6 overflow-y-auto flex-1 pb-16">
          <h3 className="text-[22px] font-black text-[#1B2A4A] mb-2">논쟁 랭킹 산정 기준</h3>
          <p className="text-[13px] text-gray-400 mb-6">AI 판결 품질과 참여도를 종합하여 순위를 결정합니다</p>

          <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
            <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider mb-3">최종 점수 공식</p>
            <div className="bg-[#1B2A4A] rounded-xl p-4 mb-3">
              <p className="text-[14px] font-mono font-bold text-[#D4AF37] text-center">AI 점수 × 70% + 참여 점수 × 30%</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-3">AI 점수 (70%)</p>
            <p className="text-[13px] text-gray-600 leading-relaxed">3개 AI 모델(GPT, Gemini, Claude)이 부여한 양측 점수의 합산입니다. 논쟁의 논리적 품질이 높을수록 점수가 올라갑니다.</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[12px] font-bold text-gray-400">범위</span>
              <span className="text-[13px] font-black text-[#1B2A4A]">0 ~ 200점</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-3">참여 점수 (30%)</p>
            <div className="space-y-2.5">
              {[
                { label: '좋아요', weight: '×3', desc: '시민들의 공감' },
                { label: '댓글', weight: '×2', desc: '시민 의견 참여' },
                { label: '시민 투표', weight: '×1', desc: '투표 참여 수' },
                { label: '조회수', weight: '×0.1', desc: '관심도 반영' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#1B2A4A]">{item.label}</span>
                    <span className="text-[11px] text-gray-400">{item.desc}</span>
                  </div>
                  <span className="text-[13px] font-black text-emerald-600">{item.weight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl p-4 mb-6 border ${isDark ? 'bg-[#D4AF37]/10 border-[#D4AF37]/20' : 'bg-[#FFF9E5] border-[#D4AF37]/20'}`}>
            <p className={`text-[12px] leading-relaxed ${isDark ? 'text-[#D4AF37]/80' : 'text-[#1B2A4A]/70'}`}>
              💡 <strong>팁:</strong> 논리적으로 탄탄한 주장을 작성하면 AI 점수가 올라가고, 다른 시민들의 관심을 받으면 참여 점수가 올라갑니다.
            </p>
          </div>

          <button onClick={() => setIsHallInfoOpen(false)} className={`w-full py-5 font-black rounded-2xl text-[18px] active:scale-95 transition-all shadow-lg ${isDark ? 'bg-gray-700 text-gray-100' : 'bg-black text-white'}`}>확인</button>
        </div>
      </BottomSheet>

      {/* ─── 플레이어 프로필 바텀시트 ─────────────────────────── */}
      <AnimatePresence>
        {selectedPlayer && (
          <PlayerProfileSheet
            player={selectedPlayer.player}
            rank={selectedPlayer.rank}
            onClose={() => setSelectedPlayer(null)}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}