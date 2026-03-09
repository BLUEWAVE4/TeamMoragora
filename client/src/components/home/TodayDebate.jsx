import React, { useState, useEffect } from 'react';

export default function TodayDebate({ item }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isVoted, setIsVoted] = useState(false);
  const [votedSide, setVotedSide] = useState(null);
  const [voteCounts, setVoteCounts] = useState({ A: 452, B: 548 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const target = new Date();
      target.setHours(23, 59, 59, 999); 
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("00:00:00");
        clearInterval(timer);
      } else {
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [item]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert("논쟁 링크가 클립보드에 복사되었습니다!");
    });
  };

  const handleVote = (side) => {
    if (isVoted) return;
    setVotedSide(side);
    setIsVoted(true);
    setVoteCounts(prev => ({ ...prev, [side]: prev[side] + 1 }));
  };

  // 투표 취소 핸들러
  const handleCancelVote = () => {
    if (!window.confirm("투표를 취소하고 다시 선택하시겠습니까?")) return;
    setVoteCounts(prev => ({ ...prev, [votedSide]: prev[votedSide] - 1 }));
    setIsVoted(false);
    setVotedSide(null);
  };

  if (!item) return null;
  const isClosed = item.status === 'closed' || timeLeft === "00:00:00";
  const totalVotes = voteCounts.A + voteCounts.B;
  const percentA = Math.round((voteCounts.A / totalVotes) * 100) || 0;
  const percentB = 100 - percentA;

  return (
    <div className="px-5 pt-3 pb-6">
      <div className="mb-4 px-1">
        <h2 className="text-[21px] font-black text-[#2D3350] tracking-tight">오늘의 논쟁</h2>
      </div>

      <div className="relative w-full bg-gradient-to-br from-[#2D3350] to-[#1a1f35] rounded-[32px] p-7 shadow-xl overflow-hidden flex flex-col min-h-[260px]">
        
        {/* 헤더: 라이브 표시 및 공유 버튼 */}
        <div className="flex justify-between items-center z-10 mb-4">
          <div className="flex items-center gap-2">
            {!isClosed ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full border border-white/10 backdrop-blur-md">
                <span className="w-1.5 h-1.5 bg-[#FF6B6B] rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black text-white uppercase tracking-wider">Live</span>
              </div>
            ) : (
              <div className="px-2.5 py-1 bg-gray-700/50 rounded-full border border-white/5">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Closed</span>
              </div>
            )}
          </div>

          <button onClick={handleShare} className="hover:opacity-60 transition-opacity p-1">
            <svg aria-label="공유" fill="none" stroke="white" strokeWidth="2.5" height="20" viewBox="0 0 24 24" width="20" className="opacity-80">
              <line x1="22" y1="3" x2="9.218" y2="10.083" strokeLinecap="round" strokeLinejoin="round"></line>
              <polygon points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334" strokeLinecap="round" strokeLinejoin="round"></polygon>
            </svg>
          </button>
        </div>
        
        <div className="mb-6 z-10">
          <h2 className="text-[18px] font-bold text-white leading-[1.4] break-keep">
            "{item.debate?.topic || '주제를 불러올 수 없습니다'}"
          </h2>
        </div>

        <div className="mt-auto z-10 space-y-4">
          {!isVoted && !isClosed ? (
            <div className="flex gap-3">
              <button onClick={() => handleVote('A')} className="flex-1 py-3 bg-white text-[#2D3350] font-black rounded-xl text-sm transition-all active:scale-95">찬성</button>
              <button onClick={() => handleVote('B')} className="flex-1 py-3 bg-white/10 text-white font-black rounded-xl text-sm border border-white/10 transition-all active:scale-95">반대</button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-end px-1 text-white">
                <div className="flex flex-col">
                  <span className="text-[#4FD1C5] text-[12px] font-black uppercase tracking-widest">찬성</span>
                  <span className="text-xl font-black">{percentA}%</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[#F687B3] text-[12px] font-black uppercase tracking-widest">반대</span>
                  <span className="text-xl font-black">{percentB}%</span>
                </div>
              </div>

              {/* 슬림 막대바 */}
              <div className="h-1.5 w-full bg-black/30 rounded-full overflow-hidden flex shadow-inner">
                <div className="h-full bg-[#4FD1C5] transition-all duration-1000" style={{ width: `${percentA}%` }} />
                <div className="h-full bg-[#F687B3] transition-all duration-1000" style={{ width: `${percentB}%` }} />
              </div>

              <div className="flex justify-between px-1 text-[11px] text-white/30 font-bold tracking-tighter">
                <span>{voteCounts.A.toLocaleString()}명 참여</span>
                
                {/* 투표 취소 버튼 추가 */}
                {!isClosed && (
                  <button 
                    onClick={handleCancelVote}
                    className="flex items-center gap-1 text-[13px] text-white/40 hover:text-white/70 transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                    </svg>
                    다시하기
                  </button>
                )}
                
                <span>{voteCounts.B.toLocaleString()}명 참여</span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
            <span className="text-[10px] font-bold text-white/40 tracking-tight">총 참여 {totalVotes.toLocaleString()}</span>
            <span className={`text-[11px] font-black font-mono ${isClosed ? 'text-gray-500' : 'text-[#FFBD43]'}`}>
              {isClosed ? 'EXPIRED' : timeLeft}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}