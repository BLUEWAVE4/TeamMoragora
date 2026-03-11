import React, { useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Zap, Medal, Star, ChevronRight, Gavel, 
  Scale, Users, User, Trophy, ShieldCheck, Info, Diamond, Crown, FlaskConical 
} from 'lucide-react';

export default function RankingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('league');
  const [isLeagueInfoOpen, setIsLeagueInfoOpen] = useState(false);

  const myNickname = user?.user_metadata?.nickname || '김준민';

  // 1. 🏅 상위 3인 시상대 데이터 (탭에 따라 변동)
  const podiumData = {
    league: [
      { rank: 1, nickname: '논리왕판사', points: 1250, wins: 45, losses: 12, draws: 3, xp: 5200, tier: '레전드' },
      { rank: 2, nickname: '정의의사도', points: 1180, wins: 42, losses: 15, draws: 5, xp: 4800, tier: '다이아' },
      { rank: 3, nickname: '팩트체커', points: 1120, wins: 38, losses: 18, draws: 2, xp: 4500, tier: '플래티넘' },
    ],
    honor: [
      { rank: 1, nickname: '대법원장', points: 15000, wins: 120, losses: 30, draws: 10, xp: 15000, level: '대법관' },
      { rank: 2, nickname: '정의로운비둘기', points: 12000, wins: 95, losses: 40, draws: 15, xp: 12000, level: '판사' },
      { rank: 3, nickname: '말싸움천재', points: 9500, wins: 80, losses: 45, draws: 5, xp: 9500, level: '검사' },
    ]
  };

  // 2. 📜 4위 이하 리스트 데이터
  const otherRankers = [
    { rank: 4, nickname: '키보드워리어', points: 980, wins: 30, losses: 25, draws: 8, xp: 3200 },
    { rank: 5, nickname: '침묵의고수', points: 850, wins: 25, losses: 20, draws: 4, xp: 2800 },
    { rank: 6, nickname: '토론꿈나무', points: 720, wins: 20, losses: 22, draws: 2, xp: 2100 },
  ];

  const currentPodium = podiumData[activeTab];

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-32 font-sans overflow-x-hidden">
      
      {/* 🍏 네비게이션 */}
      <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-2xl px-5 pt-10 pb-4 border-b border-gray-200/50">
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-[24px] font-black text-black">랭킹</h1>
          <button onClick={() => setIsLeagueInfoOpen(true)} className="flex items-center gap-1.5 text-[#007AFF] text-[15px] font-bold">
            <Info className="w-4 h-4" /> 등급 안내
          </button>
        </div>
        
        <div className="flex bg-[#7676801f] p-0.5 rounded-xl">
          <button onClick={() => setActiveTab('league')} className={`flex-1 py-2 rounded-[10px] text-[13px] font-bold transition-all ${activeTab === 'league' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>리그 랭킹</button>
          <button onClick={() => setActiveTab('honor')} className={`flex-1 py-2 rounded-[10px] text-[13px] font-bold transition-all ${activeTab === 'honor' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>명예 계급</button>
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 pt-8">
        
        {/* 🥇🥈🥉 시상 단상 (Podium) */}
        <div className="flex justify-center items-end gap-2 h-72 mb-10 px-2">
          {[1, 0, 2].map((idx) => {
            const p = currentPodium[idx];
            const isFirst = idx === 0;
            const height = isFirst ? 'h-48' : idx === 1 ? 'h-36' : 'h-32';
            const color = isFirst ? 'bg-gradient-to-b from-yellow-400 to-orange-500' : idx === 1 ? 'bg-gradient-to-b from-slate-200 to-slate-400' : 'bg-gradient-to-b from-orange-300 to-orange-700';

            return (
              <motion.div 
                key={p.nickname}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex-1 flex flex-col items-center"
              >
                {/* 프로필 이미지 & 메달 */}
                <div className="relative mb-3">
                  <div className={`rounded-full overflow-hidden border-4 ${isFirst ? 'w-20 h-20 border-yellow-400' : 'w-16 h-16 border-white'}`}>
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.nickname}`} alt="avatar" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-2 rounded-full shadow-md text-[10px] font-black">
                    {isFirst ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </div>
                </div>
                {/* 단상 */}
                <div className={`w-full ${height} ${color} rounded-t-3xl shadow-lg flex flex-col items-center pt-4 text-white`}>
                  <p className="text-[12px] font-black truncate px-2 w-full text-center">{p.nickname}</p>
                  <p className="text-[10px] font-bold opacity-80">{p.points.toLocaleString()} {activeTab === 'league' ? 'LP' : 'XP'}</p>
                  {/* 시상대 상세 전적 */}
                  <div className="mt-auto mb-4 text-[9px] font-black bg-black/20 px-2 py-1 rounded-lg">
                    {p.wins}승 {p.losses}패 {p.draws}무
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 📋 4위 이하 리스트 (상세 전적 포함) */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50 mb-10">
          {otherRankers.map((player) => (
            <div key={player.nickname} className="flex items-center p-5 active:bg-gray-50 transition-colors">
              <div className="w-8 text-[17px] font-black text-gray-200 italic">{player.rank}</div>
              <div className="flex-1 px-3">
                <p className="text-[15px] font-black text-gray-800">{player.nickname}</p>
                {/* 랭킹 프로필 상세 데이터 */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">
                    {player.wins}W {player.losses}L {player.draws}D
                  </span>
                  <span className="text-[10px] font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-md">
                    {player.xp.toLocaleString()} XP
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-black text-black">{player.points.toLocaleString()} pt</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 📘 [바텀시트] 기존 등급표 코드 유지 (생략) */}
      <AnimatePresence>
        {isLeagueInfoOpen && (
          // ... (이전 답변의 등급표 바텀시트 UI 동일하게 적용)
          <div /> // 실제 구현 시 이전 답변의 바텀시트 코드를 여기에 넣으세요.
        )}
      </AnimatePresence>
    </div>
  );
}