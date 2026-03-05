import React, { useState } from 'react';

export default function TodayDebate() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votedId, setVotedId] = useState(null); // 투표한 카드의 ID 저장

  const [debates] = useState([
    {
      id: 1,
      status: "투표종료",
      title: '"재택근무가 사무실 근무보다 생산적인가?"',
      optionA: "재택이 최고",
      optionB: "사무실이 효율적",
      votesA: 840, perA: 67,
      votesB: 420, perB: 33,
      total: 1260,
      endDate: "2024-03-01T00:00:00"
    },
    {
      id: 2,
      status: "투표진행중",
      title: '"AI가 인간의 창의성을 대체할 것인가?"',
      optionA: "대체 가능하다",
      optionB: "절대 불가능하다",
      votesA: 500, perA: 50,
      votesB: 500, perB: 50,
      total: 1000,
      endDate: "2026-03-09T23:59:59"
    }
  ]);

  const getRemainingTime = (endDate) => {
    const diff = new Date(endDate) - new Date();
    if (diff <= 0) return "종료됨";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return days > 0 ? `${days}일 ${hours}시 ${mins}분` : `${hours}시 ${mins}분`;
  };

  // 🔥 투표 취소 함수
  const handleCancelVote = (e) => {
    e.stopPropagation(); // 부모 클릭 이벤트 방지
    setVotedId(null);
  };

  return (
    <div className="px-5 flex flex-col gap-4">
      <div className="flex justify-between items-end mb-1">
        <div>
          <span className="text-[11px] font-black text-[#FF5C5C] uppercase tracking-widest animate-pulse">Hot Debate</span>
          <h2 className="text-2xl font-black text-[#56608d]">이번주 논쟁</h2>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl shadow-[#2D3350]/20 h-[300px]">
        <div 
          className="flex transition-transform duration-500 ease-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {debates.map((debate) => {
            const isOngoing = debate.status === "투표진행중";
            const showResult = !isOngoing || votedId === debate.id;

            return (
              <div key={debate.id} className="min-w-full h-full relative p-8 flex flex-col justify-between text-white overflow-hidden">
                <div className={`absolute inset-0 -z-10 transition-colors duration-700 ${
                  isOngoing ? 'bg-gradient-to-br from-[#2D3350] via-[#3a4266] to-[#2D3350]' : 'bg-[#1e2235]'
                }`} />
                
                {isOngoing && !votedId && (
                  <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,255,255,0.03)_0%,transparent_50%)] animate-[spin_10s_linear_infinite]" />
                )}

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter border transition-all ${
                      isOngoing 
                      ? "bg-[#FF5C5C] border-[#FF5C5C] text-white shadow-[0_0_12px_rgba(255,92,92,0.4)]" 
                      : "bg-white/5 border-white/10 text-white/40"
                    }`}>
                      {isOngoing && <span className="inline-block w-1.5 h-1.5 bg-white rounded-full mr-1 animate-ping" />}
                      {debate.status}
                    </span>
                  </div>
                  <h3 className="text-[22px] font-bold leading-tight mb-6 break-keep">
                    {debate.title}
                  </h3>
                </div>

                <div className="relative h-24 flex items-center">
                  {!showResult ? (
                    <div className="flex w-full gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <button 
                        onClick={() => setVotedId(debate.id)}
                        className="group relative flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-[1.2rem] text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <span className="text-white/90 group-hover:text-white">{debate.optionA}</span>
                      </button>
                      <button 
                        onClick={() => setVotedId(debate.id)}
                        className="group relative flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-[1.2rem] text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <span className="text-white/90 group-hover:text-white">{debate.optionB}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col gap-3 animate-in fade-in duration-700">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[#00C193] text-[10px] font-black uppercase tracking-widest">찬성</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[#00C193] text-[18px] font-black">{debate.perA}%</span>
                            <span className="text-white/30 text-[10px] font-medium">{debate.votesA.toLocaleString()}명</span>
                          </div>
                        </div>
                        {/* 🔥 투표 진행 중일 때만 보이는 '취소' 버튼 */}
                        {isOngoing && (
                          <button 
                            onClick={handleCancelVote}
                            className="text-[10px] font-bold text-white/30 hover:text-white/60 underline underline-offset-4 mb-1 transition-all"
                          >
                            투표 취소
                          </button>
                        )}
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[#FF5C5C] text-[10px] font-black uppercase tracking-widest">반대</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-white/30 text-[10px] font-medium">{debate.votesB.toLocaleString()}명</span>
                            <span className="text-[#FF5C5C] text-[18px] font-black">{debate.perB}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="relative w-full h-3.5 bg-black/20 rounded-full flex overflow-hidden p-[2px]">
                        <div 
                          className="h-full bg-gradient-to-r from-[#00C193] to-[#00e6af] rounded-l-full transition-all duration-[1500ms] cubic-bezier(0.34, 1.56, 0.64, 1)" 
                          style={{ width: `${debate.perA}%` }} 
                        />
                        <div 
                          className="h-full bg-gradient-to-r from-[#FF5C5C] to-[#ff7a7a] rounded-r-full transition-all duration-[1500ms] cubic-bezier(0.34, 1.56, 0.64, 1)" 
                          style={{ width: `${debate.perB}%` }} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-between items-center mt-4">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i+debate.id}`} className="w-5 h-5 rounded-full border border-[#2D3350] bg-gray-600" alt="voter" />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-white/40">{debate.total.toLocaleString()}명 참여 중</span>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    isOngoing ? "bg-[#FFD643]/10 text-[#FFD643]" : "bg-white/5 text-white/20"
                  }`}>
                    {isOngoing ? `⏳ ${getRemainingTime(debate.endDate)} 남음` : "토론 종료됨"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center gap-2.5 mt-2">
        {debates.map((_, index) => (
          <button 
            key={index} 
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${currentIndex === index ? 'w-8 bg-[#2D3350]' : 'w-1.5 bg-gray-200 hover:bg-gray-300'}`}
          />
        ))}
      </div>
    </div>
  );
}