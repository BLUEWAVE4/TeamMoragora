import React, { useState } from 'react';
import { useAuth } from '../../store/AuthContext'; 
import { motion, AnimatePresence } from 'framer-motion'; // 💡 애니메이션 라이브러리 추가

export default function RankingPage() {
  const { user } = useAuth();
  const myRealXP = 1200; 
  const myNickname = user?.user_metadata?.nickname || '김준민';

  const [selectedTier, setSelectedTier] = useState('시민');
  const [selectedUser, setSelectedUser] = useState(null);

  const tierSettings = {
    '시민': { icon: '👤', total: 10, requiredXP: 1000, next: '배심원' },
    '배심원': { icon: '📋', total: 8, requiredXP: 2500, next: '변호사' },
    '변호사': { icon: '⚖️', total: 5, requiredXP: 5000, next: '판사' },
    '판사': { icon: '👨‍⚖️', total: 4, requiredXP: 10000, next: '대법관' },
    '대법관': { icon: '🏛️', total: 3, requiredXP: 20000, next: 'MAX' }
  };

  const currentSetting = tierSettings[selectedTier];
  const xpPercentage = Math.min((myRealXP / currentSetting.requiredXP) * 100, 100);

  const userXPDetails = {
    victory: { count: 8, xp: 240 },
    draw: { count: 2, xp: 30 },
    defeat: { count: 3, xp: 15 },
    dailyDebate: { count: 15, xp: 150 },
    vote: { count: 42, xp: 126 }
  };

  const tierData = {
    '시민': [
      { rank: 1, nickname: '판결의신랑', points: 980, wins: 12, losses: 2, status: '승급권' },
      { rank: 2, nickname: '논리요정', points: 950, wins: 10, losses: 1, status: '승급권' },
      { rank: 3, nickname: '정의로운비둘기', points: 890, wins: 9, losses: 3, status: '승급권' },
      { rank: 4, nickname: '뉴비박사', points: 750, wins: 7, losses: 2 },
      { rank: 5, nickname: '말싸움천재', points: 620, wins: 5, losses: 4 },
      { rank: 6, nickname: '키보드워리어', points: 510, wins: 4, losses: 5 },
      { rank: 7, nickname: '토론꿈나무', points: 430, wins: 3, losses: 2 },
      { rank: 8, nickname: '침묵의고수', points: 310, wins: 2, losses: 1 },
      { rank: 9, nickname: '정의의사도', points: 250, wins: 1, losses: 0 },
      { rank: 10, nickname: '이제시작임', points: 120, wins: 0, losses: 3 },
    ],
    // ... 나머지 티어 데이터 (생략)
  };

  const currentRankers = tierData[selectedTier] || [];
  const top3 = currentRankers.slice(0, 3);
  const others = currentRankers.slice(3);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] pb-24 font-sans relative overflow-x-hidden">
      
      {/* 🏛️ 상단 리그 정보 (기존 유지) */}
      <div className="bg-[#2D3350] p-6 pt-10 rounded-b-[40px] shadow-xl text-white relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentSetting.icon}</span>
            <h1 className="text-xl font-black">{selectedTier} 리그</h1>
          </div>
          <div className="bg-white/10 px-3 py-1 rounded-full border border-white/10">
            <span className="text-[10px] font-black text-[#FFBD43]">TOTAL {currentSetting.total}명</span>
          </div>
        </div>

        {/* 티어 선택 탭 */}
        <div className="flex justify-between items-center mb-10 px-1">
          {Object.keys(tierSettings).map((name) => (
            <button 
              key={name} 
              onClick={() => setSelectedTier(name)}
              className={`flex flex-col items-center gap-1 transition-all ${selectedTier === name ? 'opacity-100 scale-110' : 'opacity-40 scale-90'}`}
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${selectedTier === name ? 'bg-[#FFBD43] shadow-[0_0_15px_rgba(255,189,67,0.5)] border border-white/20' : 'bg-white/10'}`}>
                <span className="text-lg">{tierSettings[name].icon}</span>
              </div>
              <span className={`text-[9px] font-black ${selectedTier === name ? 'text-[#FFBD43]' : 'text-white'}`}>{name}</span>
            </button>
          ))}
        </div>

        {/* 내 정보 섹션 */}
        <div className="px-2">
          <div className="flex justify-between items-end mb-2.5 px-0.5">
            <span className="text-[12px] font-black text-white">{myNickname}님의 {selectedTier} 리그 정보</span>
            <span className="text-white/40 font-bold uppercase text-[8px]">목표: {currentSetting.next}</span>
          </div>
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-[1px] mb-2.5">
            <div className="h-full bg-gradient-to-r from-[#FFBD43] to-[#FFD584] rounded-full transition-all duration-700" style={{ width: `${xpPercentage}%` }}></div>
          </div>
          <div className="flex justify-end gap-1.5 px-0.5 font-black italic">
            <span className="text-[#FFBD43] text-[13px]">{myRealXP.toLocaleString()} XP</span>
            <span className="text-white/20 text-[11px]">/ {currentSetting.requiredXP.toLocaleString()} XP</span>
          </div>
        </div>
      </div>

      {/* 📊 랭킹 리스트 (기존 유지) */}
      <div className="px-5 mt-8">
        <div className="flex items-center gap-2 mb-6 px-1 text-lg font-black text-[#2D3350]">
          <span>🏆</span> {selectedTier} 조 랭킹
        </div>

        {/* 포디움 */}
        <div className="flex justify-center items-end gap-2 mb-10 h-44 pt-4">
          {[1, 0, 2].map((idx) => {
            const p = top3[idx];
            if (!p) return null;
            const isFirst = idx === 0;
            return (
              <div key={p.nickname} onClick={() => setSelectedUser(p)} className={`flex flex-col items-center cursor-pointer active:scale-95 transition-transform ${isFirst ? 'z-10' : ''}`}>
                <div className="relative mb-2">
                  <div className={`${isFirst ? 'w-20 h-20' : idx === 1 ? 'w-16 h-16' : 'w-14 h-14'} rounded-full bg-white border-4 ${isFirst ? 'border-[#FFBD43]' : 'border-gray-100'} shadow-md overflow-hidden`}>
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.nickname}`} alt="avatar" />
                  </div>
                  <span className="absolute -right-1 -top-1 text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                </div>
                <p className="text-[10px] font-black text-[#2D3350] truncate w-20 text-center">{p.nickname}</p>
                <p className="text-[9px] font-bold text-gray-400 mb-2">{p.points.toLocaleString()} pt</p>
                <div className={`${isFirst ? 'w-24 h-24 bg-[#FFBD43]/30' : idx === 1 ? 'w-20 h-14 bg-gray-200/40' : 'w-18 h-10 bg-orange-200/20'} rounded-t-2xl`}></div>
              </div>
            );
          })}
        </div>

        {/* 4위 이하 리스트 */}
        <div className="flex flex-col gap-3">
          {others.map((player) => (
            <div key={player.nickname} onClick={() => setSelectedUser(player)} className={`flex items-center p-4 rounded-[25px] border cursor-pointer active:scale-[0.98] transition-all ${player.isMe ? 'bg-[#2D3350] border-[#2D3350] shadow-xl' : 'bg-white border-gray-50 shadow-sm'}`}>
              <div className={`w-8 font-black italic ${player.isMe ? 'text-white' : 'text-gray-300'}`}>{player.rank}</div>
              <div className="flex-1 px-2">
                <p className={`text-[14px] font-black ${player.isMe ? 'text-white' : 'text-[#2D3350]'}`}>{player.nickname}</p>
                <p className="text-[10px] font-bold text-gray-400">{player.wins}승 {player.losses}패 • {player.points.toLocaleString()} pt</p>
              </div>
              {player.status && <div className="px-3 py-1 bg-green-50 text-green-600 text-[9px] font-black rounded-full border border-green-100">{player.status}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* 💡 6. 아이폰 스타일 드래그 바텀 시트 */}
      <AnimatePresence>
        {selectedUser && (
          <>
            {/* 배경 흐림 처리 (클릭 시 닫힘) */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]" 
            />
            
            {/* 드래그 가능한 시트 컨텐츠 */}
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              drag="y" // 💡 세로 드래그 활성화
              dragConstraints={{ top: 0 }} // 위로는 못 올라가게
              dragElastic={0.2} // 아래로 당길 때 쫀득한 탄성
              onDragEnd={(e, info) => {
                if (info.offset.y > 150) setSelectedUser(null); // 💡 150px 이상 내리면 닫힘
              }}
              className="fixed bottom-0 left-0 right-0 z-[101] w-full max-w-lg mx-auto bg-white rounded-t-[40px] shadow-2xl p-8 cursor-default"
              style={{ touchAction: 'none' }} // 드래그 시 브라우저 스크롤 방해 금지
            >
              {/* 드래그 핸들 (ㅡ 부분) */}
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8 cursor-grab active:cursor-grabbing hover:bg-gray-300 transition-colors" />
              
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xl">📊</span>
                <h3 className="text-xl font-black text-[#2D3350]">이번 달 XP 내역</h3>
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-5 shadow-sm">
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-bold">승리 ×{userXPDetails.victory.count}</span>
                  <span className="font-black text-[#10B981]">+{userXPDetails.victory.xp} XP</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-bold">무승부 ×{userXPDetails.draw.count}</span>
                  <span className="font-black text-[#F59E0B]">+{userXPDetails.draw.xp} XP</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-bold">패배 ×{userXPDetails.defeat.count}</span>
                  <span className="font-black text-gray-400">+{userXPDetails.defeat.xp} XP</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-bold">오늘의 논쟁 ×{userXPDetails.dailyDebate.count}</span>
                  <span className="font-black text-[#3B82F6]">+{userXPDetails.dailyDebate.xp} XP</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-bold">시민 투표 ×{userXPDetails.vote.count}</span>
                  <span className="font-black text-[#8B5CF6]">+{userXPDetails.vote.xp} XP</span>
                </div>
                <div className="h-[1px] bg-gray-100 my-2" />
                <div className="flex justify-between items-center pt-2">
                  <span className="font-black text-[17px] text-[#2D3350]">이번 달 합계</span>
                  <span className="font-black text-[20px] text-[#2D3350]">561 XP</span>
                </div>
              </div>

              <button 
                onClick={() => setSelectedUser(null)}
                className="w-full mt-8 py-4 bg-[#2D3350] text-white rounded-2xl font-black active:scale-95 transition-all shadow-lg"
              >
                닫기
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}