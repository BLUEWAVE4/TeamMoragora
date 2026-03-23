import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../store/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import api from '../../services/api';
import { getAvatarUrl, DEFAULT_AVATAR_ICON } from '../../utils/avatar';
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

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const findTierByScore = (score) => {
  const pts = score || 0;
  for (let i = TIER_LIST.length - 1; i >= 0; i--) {
    if (pts >= TIER_LIST[i].min) return TIER_LIST[i];
  }
  return TIER_LIST[0];
};

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
  const totalForRate = wins + losses;         // 승률 계산용 (무승부 제외)
  const totalGames = wins + losses + draws;   // 총 참여 횟수 (무승부 포함)
  const winRate = totalForRate > 0 ? ((wins / totalForRate) * 100).toFixed(1) : '0.0';

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
                src={player.avatar_url || getAvatarUrl(player.id, player.gender) || DEFAULT_AVATAR_ICON}
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

        {/* 승률 카드 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[16px] font-bold text-gray-500 uppercase">전체 승률</span>
          </div>
          <div className="text-[32px] font-bold text-emerald-600 mb-4">{winRate}%</div>
          <div className="flex justify-between text-[16px] font-black mb-3 px-1">
            <span className="text-emerald-600">{wins}승</span>
            {draws > 0 && <span className="text-[#8E8E93]">{draws}무</span>}
            <span className="text-[#FF3B30]">{losses}패</span>
          </div>
          {/* 막대 그래프 — 승률 계산은 무승부 제외 유지 */}
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalForRate > 0 ? (wins / totalForRate) * 100 : 0}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute left-0 top-0 h-full bg-emerald-500 rounded-l-full"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalForRate > 0 ? (losses / totalForRate) * 100 : 0}%` }}
              transition={{ duration: 1, delay: 0.1, ease: 'easeOut' }}
              className="absolute right-0 top-0 h-full bg-[#FF3B30] rounded-r-full"
            />
          </div>
          {/* ✅ 총 참여 횟수 (무승부 포함) + 안내 문구 */}
          <div className="mt-4 text-center space-y-1">
            <p className="text-[16px] text-gray-400 font-bold">총 {totalGames}회 논쟁 참여</p>
            {draws > 0 && (
              <p className="text-[11px] text-[#8E8E93] font-medium">
                승률은 무승부를 제외하고 계산됩니다
              </p>
            )}
          </div>
        </div>

        {/* 티어 진행도 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[16px] font-bold text-gray-500 uppercase">티어 진행도</span>
            <span className="text-[16px] font-black" style={{ color: tier.color }}>{tier.name}</span>
          </div>
          {(() => {
            const nextTier = TIER_LIST[TIER_LIST.indexOf(tier) + 1] || null;
            const progress = nextTier
              ? Math.round(((player.total_score - tier.min) / (nextTier.min - tier.min)) * 100)
              : 100;
            return (
              <>
                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full" style={{ backgroundColor: tier.color }}
                  />
                </div>
                <p className="text-[16px] text-gray-400 font-bold text-right">
                  {nextTier ? `${(nextTier.min - player.total_score).toLocaleString()}점 더 모으면 ${nextTier.name}` : '최고 등급 달성!'}
                </p>
              </>
            );
          })()}
        </div>

        {/* 논쟁 리스트 */}
        <div className="flex items-center gap-2 mb-4 ml-1">
          <History size={18} className="text-[#8E8E93]" />
          <h3 className="text-[16px] font-bold text-[#8E8E93] uppercase tracking-wider">최근 논쟁 리스트</h3>
        </div>

        {loadingDebates ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
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
  const { isDark } = useTheme();
  const [isTierSheetOpen, setIsTierSheetOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('user'); // 'user' | 'debate'
  const [hallData, setHallData] = useState([]);
  const [hallLoading, setHallLoading] = useState(false);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/profiles/ranking');
        setRankings(res);
      } catch (err) {
        console.error('랭킹 불러오기 실패:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRankings();
  }, []);

  useEffect(() => {
    if (activeTab !== 'debate') return;
    const fetchHall = async () => {
      try {
        setHallLoading(true);
        const res = await api.get('/judgments/hall?limit=20');
        setHallData(res);
      } catch (err) {
        console.error('명예의 전당 불러오기 실패:', err);
      } finally {
        setHallLoading(false);
      }
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
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-[24px] font-black text-[#1B2A4A]">명예의 전당</h1>
                {activeTab === 'user' && (
                  <button
                    onClick={() => setIsTierSheetOpen(true)}
                    className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-[#1B2A4A]/40 active:scale-90 transition-all"
                  >
                    <Info size={20} />
                  </button>
                )}
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

            {/* ===== 논쟁 랭킹 탭 ===== */}
            {activeTab === 'debate' && (
              <div>
                {hallLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : hallData.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-[15px] font-bold text-[#1B2A4A]/30">아직 등록된 논쟁이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hallData.map((v, idx) => {
                      const d = v.debate || {};
                      const creator = d.creator || {};
                      const cat = categoryMap[d.category] || d.category || '';
                      const winLabel = v.winner_side === 'A' ? 'A측 승리' : v.winner_side === 'B' ? 'B측 승리' : '무승부';
                      const winColor = v.winner_side === 'A' ? '#059669' : v.winner_side === 'B' ? '#E63946' : '#D4AF37';
                      return (
                        <motion.div
                          key={v.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={() => window.location.href = `/moragora/${d.id}`}
                          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-all"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-black text-[#D4AF37]">#{idx + 1}</span>
                              <img
                                src={getAvatarUrl(creator.id || d.creator_id, creator.gender) || DEFAULT_AVATAR_ICON}
                                className="w-6 h-6 rounded-full"
                                alt=""
                              />
                              <span className="text-[13px] font-bold text-[#1B2A4A]">{creator.nickname || '익명'}</span>
                              {creator.tier && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: findTierByScore(0).bg, color: findTierByScore(0).color }}>
                                  {creator.tier}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${winColor}15`, color: winColor }}>
                              {winLabel}
                            </span>
                          </div>
                          <p className="text-[14px] font-bold text-[#1B2A4A] mb-2 leading-snug">{d.topic}</p>
                          <div className="flex items-center gap-2 text-[11px] text-[#1B2A4A]/40">
                            {cat && <span className="bg-gray-50 px-2 py-0.5 rounded font-semibold">{cat}</span>}
                            <span>♥ {v._likes || 0}</span>
                            <span>💬 {v._comments || 0}</span>
                            <span>👁 {v._views || 0}</span>
                            <span className="ml-auto font-bold text-[#D4AF37]">AI {v._aiScore || ((v.ai_score_a || 0) + (v.ai_score_b || 0))}</span>
                          </div>
                        </motion.div>
                      );
                    })}
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
                              <img src={p.avatar_url || getAvatarUrl(p.id, p.gender) || DEFAULT_AVATAR_ICON} alt="avatar" className="w-full h-full object-cover" />
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
                    <img src={myData?.avatar_url || getAvatarUrl(myData?.id, myData?.gender) || DEFAULT_AVATAR_ICON} alt="avatar" className="w-full h-full object-cover" />
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
                      <img src={player.avatar_url || getAvatarUrl(player.id, player.gender) || DEFAULT_AVATAR_ICON} alt="avatar" className="w-full h-full object-cover" />
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
                      <img src={myData.avatar_url || getAvatarUrl(myData.id, myData.gender) || DEFAULT_AVATAR_ICON} alt="avatar" className="w-full h-full object-cover" />
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

      {/* ─── 등급 시스템 바텀시트 ─────────────────────────────── */}
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