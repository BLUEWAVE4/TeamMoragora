import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { 
  Gavel, Scale, User, Trophy, Info, TrendingUp, BarChart3, Users, Building2, Zap, ChevronRight
} from 'lucide-react';

export default function RankingPage() {
  const { user } = useAuth();
  
  const [isLevelInfoOpen, setIsLevelInfoOpen] = useState(false);
  const [isXPDetailOpen, setIsXPDetailOpen] = useState(false);
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  const myNickname = user?.user_metadata?.nickname || '김준민';

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

  const podiumData = rankings.slice(0, 3).map((r, idx) => ({
    ...r,
    rank: idx + 1,
    color: idx === 0 ? 'from-[#FFD700] to-[#FF9500]' : idx === 1 ? 'from-[#C0C0C0] to-[#8E8E93]' : 'from-[#CD7F32] to-[#A2845E]',
    trophyColor: idx === 0 ? 'text-[#FFD700]' : idx === 1 ? 'text-[#C0C0C0]' : 'text-[#CD7F32]',
    podiumBg: idx === 0 ? 'bg-gradient-to-b from-white/60 to-white/20' : idx === 1 ? 'bg-gradient-to-b from-white/50 to-white/10' : 'bg-gradient-to-b from-white/40 to-white/5',
  }));

  const listRankers = rankings.slice(3, visibleCount + 3);

  const leagueSystem = [
    { tier: 'Tier 5', name: '대법관 (Supreme)', icon: <Building2 className="w-5 h-5" />, color: '#FF3B30', condition: '상위 1%', group: '50명 단위 그룹', rule: '매월 10명 강등' },
    { tier: 'Tier 4', name: '판사 (Judge)', icon: <Gavel className="w-5 h-5" />, color: '#FF9500', condition: '상위 5%', group: '50명 단위 그룹', rule: '매월 상위 10명 승격 / 하위 10명 강등' },
    { tier: 'Tier 3', name: '변호사 (Attorney)', icon: <Scale className="w-5 h-5" />, color: '#AF52DE', condition: '상위 20%', group: '50명 단위 그룹', rule: '매월 상위 10명 승격 / 하위 10명 강등' },
    { tier: 'Tier 2', name: '배심원 (Juror)', icon: <Users className="w-5 h-5" />, color: '#007AFF', condition: '상위 50%', group: '50명 단위 그룹', rule: '매월 상위 10명 승격 / 하위 10명 강등' },
    { tier: 'Tier 1', name: '시민 (Citizen)', icon: <User className="w-5 h-5" />, color: '#8E8E93', condition: '나머지 전체', group: '50명 단위 그룹', rule: '매월 상위 10명 승격' },
  ];

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-56 font-sans overflow-x-hidden">

      {/* 상단 내비게이션 */}
      <nav className="sticky top-0 z-[100] bg-white/70 backdrop-blur-2xl px-6 pt-14 pb-5 flex justify-between items-end border-b border-gray-200/30">
        <div>
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-0.5 ml-0.5">Hall of Fame</p>
          <h1 className="text-[28px] font-black text-black tracking-tight leading-none">명예의 전당</h1>
        </div>
        <button onClick={() => setIsLevelInfoOpen(true)} className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center text-[#007AFF] active:scale-90 transition-all">
          <Info className="w-5 h-5" />
        </button>
      </nav>

      <div className="max-w-md mx-auto px-5 pt-8">
        {/* 로딩 */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* 시상대 */}
            {podiumData.length >= 3 && (
              <div className="flex justify-center items-end gap-3 h-[360px] mb-12">
                {[1, 0, 2].map((idx) => {
                  const p = podiumData[idx];
                  const isFirst = idx === 0;
                  return (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1, type: 'spring' }} className="flex-1 flex flex-col items-center">
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2.5, delay: idx * 0.2 }}>
                        <Trophy className={`w-7 h-7 ${p.trophyColor} mb-2 drop-shadow-[0_4px_6px_rgba(0,0,0,0.1)]`} />
                      </motion.div>
                      <div className="relative mb-5">
                        <div className={`rounded-full p-1 bg-gradient-to-tr ${p.color} shadow-lg`}>
                          <div className="rounded-full bg-white p-0.5">
                            <div className={`rounded-full overflow-hidden ${isFirst ? 'w-20 h-20' : 'w-16 h-16'} bg-gray-50`}>
                              <img src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.nickname}`} alt="avatar" />
                            </div>
                          </div>
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 h-6 flex items-center justify-center rounded-full shadow-md border border-gray-100 text-[10px] font-black text-[#007AFF] whitespace-nowrap min-w-[54px] z-10">
                          {p.tier || '시민'}
                        </div>
                      </div>
                      <div className={`w-full ${isFirst ? 'h-48' : idx === 1 ? 'h-36' : 'h-32'} rounded-t-[32px] relative overflow-hidden flex flex-col items-center justify-center pt-2 shadow-2xl border border-white/60 ${p.podiumBg} backdrop-blur-md`}>
                        <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${p.color}`} />
                        <p className="text-[14px] font-black text-gray-800 mb-0.5">{p.nickname}</p>
                        <p className="text-[12px] font-extrabold text-[#007AFF] mb-3">{p.total_score?.toLocaleString()} XP</p>
                        <div className="text-[9px] font-black px-2.5 py-1 bg-black/5 rounded-full text-gray-400 uppercase tracking-tighter border border-black/5">{p.wins}W {p.losses}L</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* 랭킹 리스트 */}
            <div className="flex items-center gap-2 mb-4 px-1">
              <TrendingUp className="w-4 h-4 text-[#007AFF]" />
              <h3 className="text-[15px] font-black text-black">실시간 랭킹 순위</h3>
            </div>
            <div className="space-y-3 mb-6">
              <AnimatePresence mode='popLayout'>
                {listRankers.map((player, idx) => (
                  <motion.div key={player.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[24px] p-4 flex items-center shadow-[0_4px_12px_rgba(0,0,0,0.02)] border border-white">
                    <div className="w-8 flex flex-col items-center mr-3">
                      <span className="text-[18px] font-black text-black/20 italic">{idx + 4}</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#F2F2F7] overflow-hidden mr-4 shadow-inner">
                      <img src={player.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.nickname}`} alt="avatar" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[16px] font-bold text-black">{player.nickname}</span>
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-400 uppercase">{player.tier || '시민'}</span>
                      </div>
                      <div className="text-[11px] font-bold text-gray-400">{player.wins}승 {player.losses}패 • {player.total_score?.toLocaleString()} XP</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* 더 불러오기 */}
            {visibleCount + 3 < rankings.length && (
              <button onClick={() => setVisibleCount(v => v + 10)} className="w-full py-4 mb-10 bg-white rounded-[22px] border border-gray-100 shadow-sm text-[14px] font-bold text-gray-500 active:scale-95 transition-all">
                + 랭커 더 불러오기
              </button>
            )}
          </>
        )}
      </div>

      {/* 내 랭킹 플로팅 바 (수정된 부분) */}
      <motion.div
        initial={{ y: 100 }} animate={{ y: 0 }} whileTap={{ scale: 0.98 }}
        onClick={() => setIsXPDetailOpen(true)}
        className="fixed bottom-24 left-0 right-0 z-[90] cursor-pointer"
      >
        <div className="max-w-md mx-auto px-5">
          <div className="bg-[#EBF5FF]/90 backdrop-blur-xl border-2 border-[#007AFF]/30 shadow-[0_8px_32px_rgba(0,122,255,0.15)] rounded-[24px] p-4 flex items-center gap-4">
            <div className="w-8 flex flex-col items-center mr-3">
              <span className="text-[18px] font-black text-[#007AFF] italic">{myRank}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white overflow-hidden shadow-sm border border-[#007AFF]/10 flex-shrink-0">
              <img src={myData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myNickname}`} alt="avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[16px] font-black text-black truncate">{myNickname} (나)</span>
                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-[#007AFF] text-white uppercase flex-shrink-0">{myData?.tier || '시민'}</span>
              </div>
              <div className="flex items-center text-[11px] font-bold text-gray-500">
                <span className="whitespace-nowrap">{myData?.wins || 0}승 {myData?.losses || 0}패 {myData?.draws || 0}무</span>
                <span className="mx-1.5 opacity-30">•</span>
                <span className="text-[#007AFF] font-black whitespace-nowrap">{myData?.total_score?.toLocaleString() || 0} XP</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#007AFF]/50 flex-shrink-0" />
          </div>
        </div>
      </motion.div>

      {/* 바텀시트 1 - 내 활동 요약 */}
      <AnimatePresence>
        {isXPDetailOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsXPDetailOpen(false)} className="fixed inset-0 bg-black/40 z-[1000] backdrop-blur-sm" />
            <motion.div
              drag="y" dragConstraints={{ top: 0 }} dragElastic={0.2}
              onDragEnd={(_, info) => info.offset.y > 100 && setIsXPDetailOpen(false)}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-[#F2F2F7] z-[1001] rounded-t-[36px] overflow-hidden pb-12 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-5 mb-8" />
              <div className="px-7">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#007AFF] border border-gray-100">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-[22px] font-black text-black">내 활동 요약</h3>
                </div>
                <div className="bg-white rounded-[28px] overflow-hidden border border-white shadow-sm mb-8">
                  <div className="flex justify-between items-center p-5 border-b border-gray-50">
                    <span className="text-[16px] font-bold text-gray-800">승리</span>
                    <span className="text-[16px] font-black text-[#008161]">{myData?.wins || 0}회</span>
                  </div>
                  <div className="flex justify-between items-center p-5 border-b border-gray-50">
                    <span className="text-[16px] font-bold text-gray-800">패배</span>
                    <span className="text-[16px] font-black text-gray-400">{myData?.losses || 0}회</span>
                  </div>
                  <div className="flex justify-between items-center p-5 border-b border-gray-50">
                    <span className="text-[16px] font-bold text-gray-800">무승부</span>
                    <span className="text-[16px] font-black text-gray-400">{myData?.draws || 0}회</span>
                  </div>
                  <div className="flex justify-between items-center p-5 border-b border-gray-50">
                    <span className="text-[16px] font-bold text-gray-800">승률</span>
                    <span className="text-[16px] font-black text-[#007AFF]">
                      {myData ? (((myData.wins / (myData.wins + myData.losses + myData.draws)) || 0) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="bg-gray-50/50 p-5 flex justify-between items-center border-t border-gray-100 font-black">
                    <span className="text-[17px] text-black">보유 XP</span>
                    <span className="text-[20px] text-[#008161]">{myData?.total_score?.toLocaleString() || 0} XP</span>
                  </div>
                </div>
                <button onClick={() => setIsXPDetailOpen(false)} className="w-full py-4 bg-black text-white font-bold rounded-[22px] shadow-xl active:scale-95 transition-all">확인</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 바텀시트 2 - 리그 가이드 */}
      <AnimatePresence>
        {isLevelInfoOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLevelInfoOpen(false)} className="fixed inset-0 bg-black/40 z-[1000] backdrop-blur-sm" />
            <motion.div
              drag="y" dragConstraints={{ top: 0 }} dragElastic={0.2}
              onDragEnd={(_, info) => info.offset.y > 100 && setIsLevelInfoOpen(false)}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 200 }}

              className="fixed bottom-0 left-0 right-0 bg-[#F2F2F7] z-[1001] rounded-t-[36px] max-h-[85vh] overflow-y-auto pb-12 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-5 mb-8" />
              <div className="px-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 text-[#007AFF] mb-1">
                    <Trophy className="w-5 h-5" />
                    <span className="text-[14px] font-black uppercase tracking-widest">Verdict League</span>
                  </div>
                  <h3 className="text-[24px] font-black text-black">리그 시스템 가이드</h3>
                </div>
                <div className="space-y-4">
                  {leagueSystem.map((lv) => (
                    <div key={lv.tier} className="bg-white rounded-[26px] p-5 shadow-sm border border-white">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 rounded-[18px] flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: lv.color }}>{lv.icon}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-gray-400 uppercase">{lv.tier}</span>
                            <span className="text-[17px] font-black text-black">{lv.name}</span>
                          </div>
                          <div className="text-[12px] font-bold text-[#007AFF]">{lv.condition} • {lv.group}</div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100/50 flex items-start gap-2">
                        <Zap className="w-3.5 h-3.5 text-orange-400 mt-0.5" />
                        <p className="text-[12px] text-gray-500 font-bold leading-relaxed">{lv.rule}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setIsLevelInfoOpen(false)} className="w-full py-4 bg-black text-white font-bold rounded-[22px] mt-10">확인</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}