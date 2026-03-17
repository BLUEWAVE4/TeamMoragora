import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import api from '../../services/api';
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

// 상대방 프로필 바텀시트
function PlayerProfileSheet({ player, rank, onClose }) {
  const [debates, setDebates] = useState([]);
  const [loadingDebates, setLoadingDebates] = useState(true);
  const [visibleDebatesCount, setVisibleDebatesCount] = useState(5);

  // 바텀시트 열릴 때 배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const tier = findTierByScore(player?.total_score);
  const wins = player?.wins || 0;
  const losses = player?.losses || 0;
  const draws = player?.draws || 0;
  const totalGames = wins + losses + draws;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';
  const winPct = totalGames > 0 ? (wins / totalGames) * 100 : 0;
  const drawPct = totalGames > 0 ? (draws / totalGames) * 100 : 0;
  const lossPct = totalGames > 0 ? (losses / totalGames) * 100 : 0;

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
          .limit(50); // 충분히 가져오되 보여주는 것만 조절
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

  // 현재 보여줄 리스트 슬라이싱
  const currentDebates = debates.slice(0, visibleDebatesCount);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed bottom-0 left-0 right-0 bg-[#F2F2F7] z-[101] rounded-t-[30px] max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* 드래그 핸들 — 여기서만 드래그로 닫기 가능 */}
        <motion.div
          drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.2}
          onDragEnd={(_, info) => { if (info.offset.y > 120) onClose(); }}
          className="sticky top-0 bg-[#F2F2F7] z-10 pt-4 pb-2 cursor-grab active:cursor-grabbing rounded-t-[30px]"
        >
          <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto" />
        </motion.div>
        
        <button onClick={onClose} className="absolute top-4 right-5 w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center active:scale-90 transition-all z-20">
          <X size={20} className="text-gray-500" />
        </button>

        <div className="px-5 pb-32 overflow-y-auto flex-1 overscroll-contain touch-pan-y">
          {/* 프로필 헤더 섹션 */}
          <div className="flex items-center gap-4 mb-6 pt-2">
            <div className="relative">
              <div className="w-24 h-24 rounded-[24px] overflow-hidden border-2 shadow-lg" style={{ borderColor: tier.color }}>
                <img
                  src={player.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.nickname}`}
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
            <div className="flex justify-between items-center mb-4">
              <span className="text-[16px] font-bold text-gray-500 uppercase">전체 승률</span>
              <span className="text-[24px] font-black text-[#007AFF]">{winRate}%</span>
            </div>
            <div className="flex justify-between text-[16px] font-black mb-3 px-1">
              <span className="text-[#007AFF]">{wins}승</span>
              <span className="text-[#8E8E93]">{draws}무</span>
              <span className="text-[#FF3B30]">{losses}패</span>
            </div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex gap-[1px]">
              <motion.div initial={{ width: 0 }} animate={{ width: `${winPct}%` }} transition={{ duration: 1 }} className="h-full bg-[#007AFF] rounded-l-full" />
              <motion.div initial={{ width: 0 }} animate={{ width: `${drawPct}%` }} transition={{ duration: 1, delay: 0.1 }} className="h-full bg-[#8E8E93]" />
              <motion.div initial={{ width: 0 }} animate={{ width: `${lossPct}%` }} transition={{ duration: 1, delay: 0.2 }} className="h-full bg-[#FF3B30] rounded-r-full" />
            </div>
            <p className="text-[16px] text-gray-400 font-bold mt-4 text-center">총 {totalGames}회 참여</p>
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

          {/* 논쟁 리스트 섹션 */}
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
            <div onPointerDown={(e) => e.stopPropagation()}>
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

              {/* 논쟁 더보기 버튼 */}
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
      </motion.div>
    </>
  );
}

export default function RankingPage() {
  // ... RankingPage 로직은 위와 동일 (생략하지 않고 아까 드린 전체 코드 구조 유지)
  const { user } = useAuth();
  const [isTierSheetOpen, setIsTierSheetOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null); 
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

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

  const myRankIndex = rankings.findIndex(r => r.id === user?.id);
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : '-';
  const myData = myRankIndex !== -1 ? rankings[myRankIndex] : null;
  const currentTier = findTierByScore(myData?.total_score);

  const podiumData = rankings.slice(0, 3).map((r, idx) => ({
    ...r,
    rank: idx + 1,
    tierData: findTierByScore(r.total_score),
    color: idx === 0 ? 'from-[#FFD700] to-[#FF9500]' : idx === 1 ? 'from-[#C0C0C0] to-[#8E8E93]' : 'from-[#CD7F32] to-[#A2845E]',
    trophyColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32',
    podiumBg: idx === 0 ? 'bg-gradient-to-b from-white to-[#FFF9E5]' : idx === 1 ? 'bg-gradient-to-b from-white to-[#F5F5F7]' : 'bg-gradient-to-b from-white to-[#FAF5F0]',
  }));

  const listRankers = rankings.slice(3, visibleCount + 3);

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="max-w-md mx-auto px-5 pt-6 pb-32">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-3 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* 랭킹 헤더 + 정보 버튼 */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-[24px] font-black text-[#1B2A4A]">랭킹</h1>
              <button onClick={() => setIsTierSheetOpen(true)} className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-[#1B2A4A]/40 active:scale-90 transition-all">
                <Info size={20} />
              </button>
            </div>

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
                        <motion.div animate={{ y: [0, -6, 0], rotate: isFirst ? [-3, 3, -3] : 0 }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} className="relative z-10">
                          <Trophy size={isFirst ? 40 : 28} fill={p.trophyColor} color={p.trophyColor} className="drop-shadow-md" />
                          <Sparkles className="absolute -top-2 -right-2 w-4 h-4" style={{ color: p.trophyColor, opacity: 0.7 }} />
                        </motion.div>
                        <motion.div animate={{ opacity: [0.15, 0.4, 0.15], scale: [0.8, 1.1, 0.8] }} transition={{ repeat: Infinity, duration: 2.5 }} className="absolute inset-0 blur-xl rounded-full -z-10" style={{ backgroundColor: p.trophyColor }} />
                      </div>

                      <div className="relative mb-4">
                        <div className={`rounded-full p-0.5 bg-gradient-to-tr ${p.color} shadow-lg ${isPodiumMe ? 'ring-3 ring-blue-400 ring-offset-1' : ''}`}>
                          <div className="rounded-full bg-white p-0.5">
                            <div className={`rounded-full overflow-hidden ${isFirst ? 'w-20 h-20' : 'w-16 h-16'} bg-gray-50`}>
                              <img src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.nickname}`} alt="avatar" />
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

            {/* 내 정보 — 컴팩트 */}
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
                    <img src={myData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myData?.nickname}`} alt="avatar" className="w-full h-full object-cover" />
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

            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="w-1 h-5 bg-[#D4AF37] rounded-full" />
              <h3 className="text-[16px] font-black text-[#1B2A4A]">전체 랭킹</h3>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode='popLayout'>
                {listRankers.map((player, idx) => {
                  const isListMe = user && player.id === user.id;
                  const playerTier = findTierByScore(player.total_score);
                  return (
                    <motion.div
                      key={player.id} layout
                      onClick={() => setSelectedPlayer({ player, rank: idx + 4 })}
                      className={`rounded-[26px] p-5 flex items-center transition-all relative cursor-pointer active:scale-[0.98]
                        ${isListMe ? 'z-10 border-2 shadow-xl scale-[1.03] ring-[8px] ring-white' : 'bg-white border border-white shadow-sm'}`}
                      style={{ borderColor: isListMe ? playerTier.color : 'transparent', backgroundColor: isListMe ? `${playerTier.color}05` : 'white' }}
                    >
                      {isListMe && (
                        <div className="absolute -top-4 left-6 bg-[#007AFF] text-white text-[16px] font-black px-4 py-1.5 rounded-full shadow-lg animate-bounce flex items-center gap-2">
                          <User size={14} fill="white" /> YOU ARE HERE!
                        </div>
                      )}
                      <div className="w-12 flex flex-col items-center mr-3">
                        <span className={`text-[24px] font-black italic ${isListMe ? 'text-black' : 'text-black/15'}`}>{idx + 4}</span>
                      </div>
                      <div className="w-16 h-16 rounded-2xl bg-[#F2F2F7] overflow-hidden mr-4 shadow-inner flex-shrink-0">
                        <img src={player.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.nickname}`} alt="avatar" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[18px] font-bold truncate" style={{ color: isListMe ? playerTier.color : 'black' }}>{player.nickname}</span>
                          <span className="text-[14px] font-black px-2 py-0.5 rounded-md text-white uppercase flex-shrink-0" style={{ backgroundColor: playerTier.color }}>{playerTier.name}</span>
                        </div>
                        <div className="text-[14px] font-bold text-gray-400">{player.wins}승 {player.losses}패 • {player.total_score?.toLocaleString()} XP</div>
                      </div>
                      <ChevronRight className={`w-6 h-6 flex-shrink-0 ${isListMe ? 'text-black' : 'text-gray-200'}`} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {visibleCount + 3 < rankings.length && (
              <button onClick={() => setVisibleCount(v => v + 10)} className="w-full py-6 mt-10 bg-white rounded-[26px] border-2 border-dashed border-gray-200 text-[18px] font-black text-gray-400 active:scale-95 transition-all">
                VIEW MORE RANKERS
              </button>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {isTierSheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsTierSheetOpen(false)}
              className="fixed inset-0 bg-black/30 z-[100] backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-[#F2F2F7] z-[101] rounded-t-[30px] max-h-[88vh] flex flex-col pb-12 shadow-2xl"
            >
              <motion.div
                drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.2}
                onDragEnd={(_, info) => { if (info.offset.y > 100) setIsTierSheetOpen(false); }}
                className="cursor-grab active:cursor-grabbing rounded-t-[30px]"
              >
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-5 mb-8" />
              </motion.div>
              <div className="px-5 overflow-y-auto flex-1 overscroll-contain touch-pan-y">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-[16px] font-bold text-gray-400 uppercase tracking-widest mb-1">Point System</p>
                    <h3 className="text-[28px] font-black text-black">등급 시스템</h3>
                  </div>
                  <div className="flex flex-col items-center px-4 py-3 rounded-2xl" style={{ backgroundColor: currentTier.bg }}>
                    <currentTier.icon size={32} style={{ color: currentTier.color }} />
                    <span className="text-[16px] font-black mt-2" style={{ color: currentTier.color }}>{currentTier.name}</span>
                  </div>
                </div>
                <div className="space-y-4 mb-10">
                  {[...TIER_LIST].reverse().map((t, i) => {
                    const isCurrent = t.name === currentTier.name;
                    return (
                      <motion.div key={t.name}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-2xl p-5 flex items-center gap-4 border-2 transition-all shadow-sm"
                        style={{ backgroundColor: isCurrent ? t.bg : 'white', borderColor: isCurrent ? t.color : 'transparent' }}
                      >
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: t.bg }}>
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPlayer && (
          <PlayerProfileSheet
            player={selectedPlayer.player}
            rank={selectedPlayer.rank}
            onClose={() => setSelectedPlayer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}