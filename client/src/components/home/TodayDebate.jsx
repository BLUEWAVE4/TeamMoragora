import React, { useState, useEffect } from 'react';
import api from '../../api'; // 수정된 경로 반영

export default function TodayDebate({ item }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isVoted, setIsVoted] = useState(false);
  const [votedSide, setVotedSide] = useState(null); // 투표한 방향 저장
  const [loading, setLoading] = useState(false);
  
  // 가상의 실시간 득표수 상태 (실제로는 API에서 받아온 데이터를 사용하세요)
  const [voteCounts, setVoteCounts] = useState({
    A: 452, // 찬성 표수
    B: 548  // 반대 표수
  });

  // 1. ⏳ 24시간 실시간 카운트다운 로직
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
        setTimeLeft(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        );
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [item]);

  // 2. ✅ 투표하기 핸들러
  const handleVote = async (side) => {
    if (isVoted || loading) return;
    try {
      setLoading(true);
      await api.post(`/debates/${item.id}/vote`, { side });
      
      setVotedSide(side);
      setIsVoted(true);
      // 득표수 1 증가 (UI 즉시 반영용)
      setVoteCounts(prev => ({ ...prev, [side]: prev[side] + 1 }));
    } catch (err) {
      alert("투표 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 3. 🔄 투표 취소 핸들러
  const handleCancelVote = async () => {
    if (!isVoted || loading) return;
    if (!window.confirm("투표를 취소하시겠습니까?")) return;

    try {
      setLoading(true);
      await api.delete(`/debates/${item.id}/vote`); // 취소 API 호출
      
      // 득표수 1 감소 (UI 즉시 반영용)
      setVoteCounts(prev => ({ ...prev, [votedSide]: prev[votedSide] - 1 }));
      setIsVoted(false);
      setVotedSide(null);
      alert("투표가 취소되었습니다.");
    } catch (err) {
      alert("취소 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;
  const isClosed = item.status === 'closed' || timeLeft === "00:00:00";
  const totalVotes = voteCounts.A + voteCounts.B;
  const percentA = Math.round((voteCounts.A / totalVotes) * 100) || 0;

  return (
    <div className="px-6 pt-2">
      <div className="flex justify-between items-end mb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">HOT DEBATE</span>
          <h2 className="text-2xl font-black text-[#2D3350]">오늘의 논쟁</h2>
        </div>
      </div>

      <div className="relative w-full bg-[#2D3350] rounded-[40px] p-8 shadow-2xl shadow-[#2D3350]/20 overflow-hidden flex flex-col justify-between transition-all min-h-[300px]">
        
        <div className={`absolute top-6 left-8 px-4 py-1.5 text-white text-[10px] font-black rounded-full shadow-lg z-10 ${
          isClosed ? 'bg-gray-500' : 'bg-[#FF6B6B]'
        }`}>
          {isClosed ? '투표종료' : '투표진행중'}
        </div>
        
        <div className="mt-10 mb-6">
          <h2 className="text-xl font-black text-white leading-[1.4] break-keep">
            "{item.debate?.topic || '주제를 불러올 수 없습니다'}"
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {!isVoted && !isClosed ? (
            <div className="flex gap-3">
              <button 
                onClick={() => handleVote('A')}
                className="flex-1 py-3.5 bg-teal-400 hover:bg-teal-300 text-[#2D3350] font-black rounded-2xl text-sm transition-all active:scale-95"
              >
                찬성 투표
              </button>
              <button 
                onClick={() => handleVote('B')}
                className="flex-1 py-3.5 bg-rose-400 hover:bg-rose-300 text-white font-black rounded-2xl text-sm transition-all active:scale-95"
              >
                반대 투표
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-end text-white">
                <div className="flex flex-col">
                  <span className="text-teal-400 text-[10px] font-black uppercase">Agree</span>
                  <span className="text-lg font-black">{voteCounts.A.toLocaleString()}표</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-rose-400 text-[10px] font-black uppercase">Disagree</span>
                  <span className="text-lg font-black">{voteCounts.B.toLocaleString()}표</span>
                </div>
              </div>

              <div className="h-2.5 w-full bg-white/10 rounded-full flex overflow-hidden border border-white/5">
                <div 
                  className={`${isClosed ? 'bg-gray-400' : 'bg-teal-400'} transition-all duration-1000`} 
                  style={{ width: `${percentA}%` }} 
                />
                <div className={`${isClosed ? 'bg-gray-600' : 'bg-rose-400'} flex-1`} />
              </div>

              {isVoted && !isClosed && (
                <button 
                  onClick={handleCancelVote}
                  className="text-[10px] font-bold text-white/40 hover:text-white/60 transition-colors underline underline-offset-4"
                >
                  투표 취소하고 다시하기
                </button>
              )}
            </div>
          )}

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
            <span className="text-[10px] font-bold text-white/40">현재 {totalVotes.toLocaleString()}명 참여</span>
            
            <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl border ${
              isClosed 
              ? 'text-gray-400 bg-gray-400/10 border-gray-400/20' 
              : 'text-[#FFBD43] bg-[#FFBD43]/10 border-[#FFBD43]/20'
            }`}>
              {isClosed ? '⌛ 종료됨' : `⏳ ${timeLeft}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}