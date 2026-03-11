import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext'; 
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Zap, Award, Crown, Diamond, FlaskConical, Medal, Star, ChevronRight, Gavel, Scale, Users, User } from 'lucide-react'; 

export default function RankingPage() {
  const { user } = useAuth();
  const myRealXP = 1200; 
  const myNickname = user?.user_metadata?.nickname || '김준민';

  const [selectedTier, setSelectedTier] = useState('브론즈 배심원'); 
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLeagueInfoOpen, setIsLeagueInfoOpen] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false); 

  // 기존 메인 영역 티어 설정
  const tierSettings = {
    '브론즈 배심원': { icon: <Medal className="w-4 h-4 text-[#EF4444]" />, requiredXP: 500, next: '실버' },
    '실버 배심원': { icon: <Medal className="w-4 h-4 text-[#94A3B8]" />, requiredXP: 1000, next: '골드' },
    '골드 배심원': { icon: <Medal className="w-4 h-4 text-[#F97316]" />, requiredXP: 2500, next: '플래티넘' },
    '플래티넘 배심원': { icon: <FlaskConical className="w-4 h-4 text-[#10B981]" />, requiredXP: 5000, next: '다이아' },
    '다이아 배심원': { icon: <Diamond className="w-4 h-4 text-[#3B82F6]" />, requiredXP: 10000, next: '레전드' },
    '레전드 배심원': { icon: <Crown className="w-4 h-4 text-[#F59E0B]" />, requiredXP: 20000, next: 'MAX' }
  };

  // ✨ 바텀시트용 새로운 리그 등급표 데이터 (이미지 기획 반영)
  const officialLeagues = [
    { name: '대법관 (Supreme)', info: '상위 1% · 50명 단위 그룹', rule: '매월 하위 10명 강등', color: 'bg-[#FFFBEB]', textColor: 'text-[#F59E0B]', icon: <Crown className="w-5 h-5 text-[#F59E0B]" /> },
    { name: '판사 (Judge)', info: '상위 5% · 50명 단위 그룹', rule: '상위 10명 승격 / 하위 10명 강등', color: 'bg-[#F5F5F7]', textColor: 'text-[#5856D6]', icon: <Gavel className="w-5 h-5 text-[#5856D6]" /> },
    { name: '변호사 (Attorney)', info: '상위 20% · 50명 단위 그룹', rule: '상위 10명 승격 / 하위 10명 강등', color: 'bg-[#EFF6FF]', textColor: 'text-[#007AFF]', icon: <Scale className="w-5 h-5 text-[#007AFF]" /> },
    { name: '배심원 (Juror)', info: '상위 50% · 50명 단위 그룹', rule: '상위 10명 승격 / 하위 10명 강등', color: 'bg-[#F2F2F7]', textColor: 'text-[#8E8E93]', icon: <Users className="w-5 h-5 text-[#8E8E93]" /> },
    { name: '시민 (Citizen)', info: '모든 신규 사용자 시작점', rule: '매월 상위 10명 승격', color: 'bg-white', textColor: 'text-gray-400', icon: <User className="w-5 h-5 text-gray-400" /> },
  ];

  const currentSetting = tierSettings[selectedTier];
  const xpPercentage = Math.min((myRealXP / currentSetting.requiredXP) * 100, 100);
  
  const tierData = {
    '브론즈 배심원': [
      { rank: 1, nickname: '판결의신랑', points: 480, wins: 12, losses: 2, status: '승급권' },
      { rank: 2, nickname: '논리요정', points: 450, wins: 10, losses: 1, status: '승급권' },
      { rank: 3, nickname: '정의로운비둘기', points: 390, wins: 9, losses: 3, status: '승급권' },
      { rank: 4, nickname: '뉴비박사', points: 350, wins: 7, losses: 2 },
      { rank: 5, nickname: '말싸움천재', points: 320, wins: 5, losses: 4 },
      { rank: 6, nickname: '키보드워리어', points: 310, wins: 4, losses: 5 },
      { rank: 7, nickname: '토론꿈나무', points: 230, wins: 3, losses: 2, isMe: true },
      { rank: 8, nickname: '침묵의고수', points: 210, wins: 2, losses: 1 },
      { rank: 9, nickname: '정의의사도', points: 150, wins: 1, losses: 0 },
      { rank: 10, nickname: '이제시작임', points: 120, wins: 0, losses: 3 },
    ],
  };

  const currentRankers = tierData[selectedTier] || tierData['브론즈 배심원'];
  const top3 = currentRankers.slice(0, 3);
  const others = currentRankers.slice(3);

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-32 font-[-apple-system,BlinkMacSystemFont,sans-serif] overflow-x-hidden">
      
      {/* 🍏 iOS Navigation Bar */}
      <nav className="sticky top-0 z-[100] bg-[#F2F2F7]/80 backdrop-blur-2xl px-5 h-14 flex items-center justify-between border-b border-gray-200/40">
        <h1 className="text-[17px] font-bold text-black tracking-tight">랭킹</h1>
        <button 
          onClick={() => setIsLeagueInfoOpen(true)}
          className="flex items-center gap-1 text-[#007AFF] text-[17px] font-medium active:opacity-40 transition-opacity"
        >
          <Target className="w-4 h-4" /> 리그 정보
        </button>
      </nav>

      <div className="max-w-md mx-auto px-4 pt-6">
        
        {/* 🏛️ 티어 선택 영역 (기존 유지) */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar bg-gray-200/60 p-1 rounded-xl mb-9 border border-gray-100/30 shadow-inner">
          {Object.keys(tierSettings).map((name) => (
            <button 
              key={name} 
              onClick={() => setSelectedTier(name)}
              className={`flex-none px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all duration-200 whitespace-nowrap ${
                selectedTier === name ? 'bg-white shadow-md text-black scale-[1.02]' : 'text-gray-500'
              }`}
            >
              {name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* 🏆 내 진행도 카드 (기존 유지) */}
        <motion.div 
          whileTap={{ scale: 0.98 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/50 mb-10 cursor-pointer"
          onClick={() => setShowLevelUp(true)}
        >
          <div className="flex justify-between items-start mb-5">
            <div>
              <p className="text-[10px] font-black text-[#8E8E93] uppercase tracking-[0.15em] mb-1">My Journey</p>
              <h2 className="text-2xl font-black text-black tracking-tight">{myNickname}님</h2>
            </div>
            <div className="bg-[#F2F2F7] px-3 py-1.5 rounded-full text-[11px] font-bold text-gray-400 flex items-center gap-1.5 border border-gray-100/50">
              {currentSetting.icon} Next: {currentSetting.next}
            </div>
          </div>
          <div className="w-full h-3 bg-[#F2F2F7] rounded-full overflow-hidden mb-4 p-[1px]">
            <motion.div 
              initial={{ width: 0 }} animate={{ width: `${xpPercentage}%` }} 
              transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
              className="h-full bg-gradient-to-r from-[#007AFF] to-[#54D6FF] rounded-full shadow-[0_0_12px_rgba(0,122,255,0.25)]" 
            />
          </div>
          <div className="flex justify-between items-center px-1">
             <span className="text-[12px] font-bold text-gray-300 italic tracking-tight">{myRealXP.toLocaleString()} XP</span>
             <span className="text-[13px] font-black text-black flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-[#FFD60A]" /> {currentSetting.requiredXP.toLocaleString()} XP 까지</span>
          </div>
        </motion.div>

        {/* 🥇 Top 3 포디움 (기존 유지) */}
        <div className="flex justify-center items-end gap-3 h-60 mb-14 px-1 pt-4">
          {[1, 0, 2].map((idx) => {
            const p = top3[idx];
            if (!p) return null;
            const isFirst = idx === 0;
            const podiumConfig = isFirst 
              ? { h: 'h-44', medal: '🥇', order: 'order-2', shadow: 'shadow-2xl shadow-[#FF9500]/20' }
              : idx === 1 
              ? { h: 'h-32', medal: '🥈', order: 'order-1', shadow: 'shadow-xl shadow-gray-200/50' }
              : { h: 'h-28', medal: '🥉', order: 'order-3', shadow: 'shadow-lg shadow-amber-200/50' };

            return (
              <motion.div 
                key={p.nickname} 
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 25, delay: idx * 0.1 }}
                onClick={() => setSelectedUser(p)}
                className={`flex-1 flex flex-col items-center cursor-pointer ${podiumConfig.order}`}
              >
                <div className="relative mb-3 z-10">
                  <div className={`rounded-full overflow-hidden border-4 ${isFirst ? 'w-20 h-20 border-[#FF9500] scale-105' : 'w-16 h-16 border-white/90'}`}>
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.nickname}`} alt="avatar" />
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white px-2 py-0.5 rounded-full shadow-md text-[10px] font-black">
                    {podiumConfig.medal}
                  </div>
                </div>
                <div className={`
                  w-full ${podiumConfig.h} ${podiumConfig.shadow} rounded-t-[24px] border border-gray-100/30 p-3 pt-5 flex flex-col items-center text-center relative overflow-hidden
                  ${isFirst ? 'bg-gradient-to-b from-[#FFBD43] to-[#FF9F0A]' : idx === 1 ? 'bg-gradient-to-b from-gray-100 to-gray-200' : 'bg-gradient-to-b from-[#E6B398] to-[#D4A373]'}
                `}>
                  <p className="text-[12px] font-bold text-black truncate w-full relative z-10">{p.nickname}</p>
                  <p className={`text-[10px] font-bold mt-1 relative z-10 ${isFirst ? 'text-black/60' : 'text-gray-400'}`}>{p.points.toLocaleString()} pt</p>
                  <p className={`mt-auto mb-2 text-[10px] font-black tracking-tighter uppercase italic relative z-10 ${isFirst ? 'text-black/20' : 'text-gray-300'}`}>
                    {idx === 0 ? '1st' : idx === 1 ? '2nd' : '3rd'}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 📜 4위 이하 리스트 (기존 유지) */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100/50 divide-y divide-gray-50 overflow-hidden mb-12">
          {others.map((player) => (
            <motion.div 
              key={player.nickname} 
              whileTap={{ backgroundColor: "#F9F9F9" }}
              onClick={() => setSelectedUser(player)} 
              className="flex items-center p-4.5 cursor-pointer transition-colors"
            >
              <div className="w-8 text-[15px] font-black text-gray-200 italic tabular-nums tracking-tighter">{player.rank}</div>
              <div className="flex-1 px-2 font-bold text-[15px] text-gray-800">{player.nickname}</div>
              <div className="text-[12px] font-bold text-gray-400 tabular-nums">{player.points.toLocaleString()} pt</div>
              <ChevronRight className="w-4 h-4 text-gray-200 ml-2" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* 📘 수정된 리그 정보 바텀 시트 (Verdict 공식 등급 반영) */}
      <AnimatePresence>
        {isLeagueInfoOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsLeagueInfoOpen(false)}
              className="fixed inset-0 z-[110] bg-black/30 backdrop-blur-[4px]" 
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 250, mass: 0.8 }}
              drag="y" dragConstraints={{ top: 0 }} dragElastic={0.1}
              onDragEnd={(e, info) => { if (info.offset.y > 80) setIsLeagueInfoOpen(false); }}
              className="fixed bottom-0 left-0 right-0 z-[120] bg-[#F2F2F7] rounded-t-[32px] shadow-2xl overflow-hidden border-t border-white flex flex-col max-h-[85vh]"
            >
              <div className="w-9 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-2 shrink-0" />
              
              <div className="bg-white pt-4 pb-6 text-center border-b border-gray-100 shrink-0">
                <h2 className="text-black text-[20px] font-black tracking-tight">VERDICT 리그 시스템</h2>
                <p className="text-[12px] text-gray-400 font-bold mt-1 uppercase tracking-wider">League Ranking Rules</p>
              </div>

              <div className="p-5 pb-12 space-y-3 overflow-y-auto">
                {officialLeagues.map((tier, i) => (
                  <motion.div 
                    key={tier.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-[24px] p-5 flex flex-col shadow-sm border border-gray-100/50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl ${tier.color} flex items-center justify-center shadow-inner`}>{tier.icon}</div>
                        <div>
                          <span className={`text-[16px] font-black ${tier.textColor}`}>{tier.name}</span>
                          <p className="text-[11px] text-gray-400 font-bold tracking-tight">{tier.info}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 py-2 px-3 bg-gray-50 rounded-xl border border-gray-100">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-bold text-gray-500">{tier.rule}</span>
                    </div>
                  </motion.div>
                ))}
                
                <button 
                  onClick={() => setIsLeagueInfoOpen(false)}
                  className="w-full mt-4 py-4.5 bg-black text-white rounded-[20px] font-bold text-[17px] active:scale-[0.98] transition-all shadow-lg"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🎉 승급 팝업 (기존 유지) */}
      <AnimatePresence>
        {showLevelUp && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLevelUp(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl relative z-10 p-8 text-center"
            >
              <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FFBD43] to-[#FFD60A] flex items-center justify-center mb-6 mx-auto shadow-lg">
                <Medal className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-2xl font-black text-black mb-3">실버 등급 달성!</h2>
              <p className="text-gray-500 text-[15px] font-medium leading-relaxed mb-8">축하합니다!<br/>정의로운 판결로 명성이 높아졌습니다.</p>
              <button onClick={() => setShowLevelUp(false)} className="w-full py-4.5 bg-[#007AFF] text-white rounded-2xl font-bold text-[17px]">확인</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}