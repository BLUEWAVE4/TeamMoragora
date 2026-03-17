import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../store/AuthContext';
import { castVote, getVoteTally, cancelVote } from '../../services/api';

// 개별 카드 컴포넌트
function DebateBannerCard({ item }) {
  const { user } = useAuth();

  const debateId = item?.debate_id;
  const isVotingStatus = item?.debate?.status === 'voting';
  const storageKey = `today_vote_${debateId}_${user?.id}`;
  const savedVote = localStorage.getItem(storageKey);

  const [myVote, setMyVote] = useState(savedVote || null);
  const [voteCounts, setVoteCounts] = useState({ A: 0, B: 0 });
  const [isVoting, setIsVoting] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // 투표 현황 조회
  useEffect(() => {
    if (!debateId) return;
    const fetchVoteCounts = async () => {
      try {
        const res = await getVoteTally(debateId);
        setVoteCounts({ A: res?.A ?? 0, B: res?.B ?? 0 });
      } catch (err) {
        console.log('투표 현황 에러:', err);
      }
    };
    fetchVoteCounts();
  }, [debateId]);

  // 카운트다운
  useEffect(() => {
    const getTarget = () => {
      if (item?.vote_deadline) return new Date(item.vote_deadline);
      if (item?.created_at) {
        const t = new Date(item.created_at);
        t.setHours(t.getHours() + 24);
        return t;
      }
      const t = new Date(); t.setHours(23, 59, 59, 999); return t;
    };

    const tick = () => {
      const diff = getTarget() - new Date();
      if (diff <= 0) { setTimeLeft('00:00:00'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [item?.vote_deadline]);

  const handleVote = async (side) => {
    if (!user) { alert('로그인이 필요합니다.'); return; }
    if (isVoting || !isVotingStatus || isParticipant) return;

    const isCanceling = myVote === side;
    const prevVote = myVote;
    const prevCounts = { ...voteCounts };

    const nextVote = isCanceling ? null : side;
    setMyVote(nextVote);
    nextVote ? localStorage.setItem(storageKey, nextVote) : localStorage.removeItem(storageKey);

    setVoteCounts(prev => {
      const next = { ...prev };
      if (isCanceling) { next[side] -= 1; }
      else if (!prevVote) { next[side] += 1; }
      else { next[prevVote] -= 1; next[side] += 1; }
      return next;
    });

    setIsVoting(true);
    try {
      if (isCanceling) { await cancelVote(debateId); }
      else { await castVote(debateId, side); }
    } catch (err) {
      setMyVote(prevVote);
      prevVote ? localStorage.setItem(storageKey, prevVote) : localStorage.removeItem(storageKey);
      setVoteCounts(prevCounts);
      alert(err?.message || '투표 처리에 실패했습니다.');
    } finally {
      setIsVoting(false);
    }
  };

  if (!item) return null;

  const isParticipant = user && (item.debate?.creator_id === user.id || item.debate?.opponent_id === user.id);
  const isClosed = !isVotingStatus || timeLeft === '00:00:00';
  const totalVotes = voteCounts.A + voteCounts.B;
  const percentA = totalVotes === 0 ? 50 : Math.round((voteCounts.A / totalVotes) * 100);
  const percentB = 100 - percentA;
  const showResult = myVote !== null || isClosed;

  return (
    <div className="relative w-full bg-gradient-to-br from-[#2D3350] to-[#1a1f35] rounded-[32px] p-7 shadow-xl overflow-hidden flex flex-col min-h-[260px]">

      {/* 헤더 */}
      <div className="z-10 mb-4">
        <h2 className="text-[13px] font-black text-white/50 uppercase tracking-widest">오늘의 논쟁</h2>
      </div>

      {/* 주제 */}
      <div className="mb-6 z-10 flex-1">
        <h2 className="text-[18px] font-bold text-white leading-[1.4] break-keep">
          "{item.debate?.topic || '주제를 불러올 수 없습니다'}"
        </h2>
      </div>

      {/* 투표 영역 */}
      <div className="z-10 space-y-4">
        {!showResult ? (
          <div>
            {isParticipant && (
              <p className="text-[11px] text-center text-white/50 font-bold mb-2">논쟁 당사자는 투표할 수 없습니다</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => handleVote('A')} disabled={isVoting || isParticipant}
                className={`flex-1 py-3 bg-white text-[#2D3350] font-black rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50`}>
                찬성
              </button>
              <button onClick={() => handleVote('B')} disabled={isVoting || isParticipant}
                className={`flex-1 py-3 bg-white/10 text-white font-black rounded-xl text-sm border border-white/10 transition-all active:scale-95 disabled:opacity-50`}>
                반대
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-end px-1 text-white">
              <div className="flex flex-col">
                <span className={`text-[12px] font-black uppercase tracking-widest ${myVote === 'A' ? 'text-[#4FD1C5]' : 'text-white/40'}`}>
                  {myVote === 'A' ? '✓ 찬성' : '찬성'}
                </span>
                <span className="text-xl font-black">{percentA}%</span>
                <span className="text-[10px] text-white/30">{voteCounts.A.toLocaleString()}명</span>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-[12px] font-black uppercase tracking-widest ${myVote === 'B' ? 'text-[#F687B3]' : 'text-white/40'}`}>
                  {myVote === 'B' ? '✓ 반대' : '반대'}
                </span>
                <span className="text-xl font-black">{percentB}%</span>
                <span className="text-[10px] text-white/30">{voteCounts.B.toLocaleString()}명</span>
              </div>
            </div>
            <div className="h-1.5 w-full bg-black/30 rounded-full overflow-hidden flex shadow-inner">
              <div className="h-full bg-[#4FD1C5] transition-all duration-1000" style={{ width: `${percentA}%` }} />
              <div className="h-full bg-[#F687B3] transition-all duration-1000" style={{ width: `${percentB}%` }} />
            </div>
            <div className="flex justify-between px-1 text-[11px] text-white/30 font-bold">
              <span>총 {totalVotes.toLocaleString()}명 참여</span>
              {!isClosed && myVote && (
                <button onClick={() => handleVote(myVote)} disabled={isVoting}
                  className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors disabled:opacity-30">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                  </svg>
                  다시하기
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-white/5">
          <span className="text-[10px] font-bold text-white/40">총 참여 {totalVotes.toLocaleString()}</span>
          <span className={`text-[11px] font-black font-mono ${isClosed ? 'text-gray-500' : 'text-[#FFBD43]'}`}>
            {isClosed ? 'EXPIRED' : timeLeft}
          </span>
        </div>
      </div>
    </div>
  );
}

// 배너 래퍼 컴포넌트
export default function TodayDebate({ items = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const startXRef = useRef(null);
  const containerRef = useRef(null);

  const validItems = items.filter(Boolean);
  if (validItems.length === 0) return null;

  const goTo = (index) => {
    if (index < 0 || index >= validItems.length) return;
    setCurrentIndex(index);
  };

  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (startXRef.current === null) return;
    const diff = startXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goTo(currentIndex + 1); // 왼쪽 스와이프 → 다음
      else goTo(currentIndex - 1);           // 오른쪽 스와이프 → 이전
    }
    startXRef.current = null;
  };

  // 마우스 드래그 (PC 지원)
  const mouseStartXRef = useRef(null);
  const handleMouseDown = (e) => { mouseStartXRef.current = e.clientX; };
  const handleMouseUp = (e) => {
    if (mouseStartXRef.current === null) return;
    const diff = mouseStartXRef.current - e.clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goTo(currentIndex + 1);
      else goTo(currentIndex - 1);
    }
    mouseStartXRef.current = null;
  };

  return (
    <div className="px-5 pt-3 pb-6">
      {/* 스와이프 영역 */}
      <div
        ref={containerRef}
        className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {validItems.map((item, i) => (
            <div key={item?.debate_id || i} className="w-full flex-shrink-0">
              <DebateBannerCard item={item} />
            </div>
          ))}
        </div>
      </div>

      {/* 인디케이터 dots */}
      {validItems.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {validItems.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentIndex ? '20px' : '6px',
                height: '6px',
                backgroundColor: i === currentIndex ? '#2D3350' : '#D1D5DB',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}