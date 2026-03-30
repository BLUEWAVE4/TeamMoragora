import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../store/AuthContext';
import api, { castVote, cancelVote, toggleDebateLike, getMyVote } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AI_JUDGES } from '../../constants/judges';
import LoginPromptModal from '../common/LoginPromptModal';
import MoragoraModal from '../common/MoragoraModal';
import useModalState from '../../hooks/useModalState';
import CommentBottomSheet from '../common/CommentBottomSheet';

// 개별 카드 컴포넌트
const DebateBannerCard = React.memo(function DebateBannerCard({ item, initialVote }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const debateId = item?.debate_id;
  const isVotingStatus = item?.debate?.status === 'voting';
  const isCompleted = item?.debate?.status === 'completed';
  const [myVote, setMyVote] = useState(initialVote || null);

  // 배치 데이터 없으면 개별 조회 폴백
  useEffect(() => {
    if (initialVote !== undefined) return;
    if (!debateId || !user) return;
    getMyVote(debateId).then(res => {
      setMyVote(res?.voted_side || null);
    }).catch(() => {});
  }, [debateId, user, initialVote]);
  const [voteCounts, setVoteCounts] = useState({ A: item?.citizen_score_a ?? 0, B: item?.citizen_score_b ?? 0 });
  const [isVoting, setIsVoting] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [voteExpired, setVoteExpired] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { modalState, showModal, closeModal } = useModalState();

  // 투표 수는 서버에서 citizen_score_a/b로 이미 내려옴 — 개별 fetch 제거

  // 타이머: vote_duration(일) 기반 카운트다운, 없으면 24시간 기본
  useEffect(() => {
    const createdAt = item?.debate?.created_at || item?.created_at;
    if (!createdAt) return;

    const voteDuration = item?.debate?.vote_duration ?? 1; // 기본 1일
    const totalMs = Number(voteDuration) * 24 * 60 * 60 * 1000;
    const deadline = new Date(new Date(createdAt).getTime() + totalMs);
    const pad = (n) => String(n).padStart(2, '0');

    const tick = () => {
      const diff = deadline.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00');
        setVoteExpired(true);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${pad(h)}:${pad(m)}`);
      setVoteExpired(false);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [item?.debate?.created_at, item?.created_at, item?.debate?.vote_duration]);

  const handleVote = async (side) => {
    if (!user) { setShowLoginModal(true); return; }
    if (isVoting || !isVotingStatus || isParticipant || voteExpired) return;

    const isCanceling = myVote === side;
    const prevVote = myVote;
    const prevCounts = { ...voteCounts };

    const nextVote = isCanceling ? null : side;
    setMyVote(nextVote);

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
      setVoteCounts(prevCounts);
      showModal('투표 처리에 실패했습니다', '잠시 후 다시 시도해주세요.');
    } finally {
      setIsVoting(false);
    }
  };

  // 좋아요/댓글/조회수
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);

  // 내가 좋아요 했는지 서버 API로 조회
  useEffect(() => {
    if (!debateId || !user) return;
    api.get(`/debates/${debateId}/like/me`).then(res => setLiked(!!res?.liked)).catch(() => {});
  }, [debateId, user]);

  const handleLike = async () => {
    if (!user) return;
    const prev = liked;
    const prevCount = likeCount;
    setLiked(!prev);
    setLikeCount(prev ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      await toggleDebateLike(debateId);
    } catch { setLiked(prev); setLikeCount(prevCount); }
  };

  // 댓글 바텀시트
  const [isCommentOpen, setIsCommentOpen] = useState(false);

  if (!item) return null;

  const isParticipant = user && (item.debate?.creator_id === user.id || item.debate?.opponent_id === user.id);
  const isClosed = !isVotingStatus || voteExpired;
  const totalVotes = voteCounts.A + voteCounts.B;
  const percentA = totalVotes === 0 ? 50 : Math.round((voteCounts.A / totalVotes) * 100);
  const percentB = 100 - percentA;
  const showResult = myVote !== null || isClosed;
  const proSide = item.debate?.pro_side || '찬성';
  const conSide = item.debate?.con_side || '반대';

  return (
    <>
    <div className="relative w-full bg-gradient-to-b from-[#1B2A4A] to-[#0f1a30] rounded-2xl p-6 shadow-lg overflow-hidden flex flex-col min-h-[280px] border border-[#D4AF37]/15">
      {/* 배경 장식 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#D4AF37]/3 rounded-full blur-2xl" />

      {/* AI 대결 헤더 + 상세보기 */}
      {(() => {
        const desc = item.debate?.description || '';
        const names = desc.split(' vs ');
        const nameA = names[0]?.trim() || '지피티';
        const nameB = names[1]?.trim() || '클로드';
        const findJudge = (name) => Object.values(AI_JUDGES).find(j => j.name === name) || AI_JUDGES.gpt;
        const jA = findJudge(nameA);
        const jB = findJudge(nameB);
        return (
          <div className="z-10 mb-3 flex items-center justify-center relative">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border-2" style={{ borderColor: jA.borderColor || jA.color }}>
                  <img src={jA.avatar} alt="" className="w-full h-full" />
                </div>
                <span className="text-[12px] font-bold text-white/80">{nameA}</span>
              </div>
              <span className="text-[11px] font-black text-[#D4AF37]/60">VS</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold text-white/80">{nameB}</span>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border-2" style={{ borderColor: jB.borderColor || jB.color }}>
                  <img src={jB.avatar} alt="" className="w-full h-full" />
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate(`/moragora/${debateId}`)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-[#D4AF37] active:bg-white/10 active:scale-90 transition-all"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 6 15 12 9 18"/></svg>
            </button>
          </div>
        );
      })()}

      {/* 주제 */}
      <div className="mb-5 z-10 flex-1">
        <h2 className="text-[18px] font-sans font-bold text-white leading-[1.5] break-keep text-center">
          "{item.debate?.topic || '주제를 불러올 수 없습니다'}"
        </h2>
      </div>

      {/* 투표 영역 */}
      <div className="z-10 space-y-3">
        {!showResult ? (
          <div>
            {isParticipant && (
              <p className="text-[11px] text-center text-[#D4AF37]/50 font-bold mb-2">논쟁 당사자는 투표할 수 없습니다</p>
            )}
            <div className="flex gap-2.5">
              <button onClick={() => handleVote('A')} disabled={isVoting || isParticipant}
                className={`flex-1 py-3 font-sans font-bold rounded-xl text-sm transition-all active:scale-95 disabled:opacity-40 border ${
                  myVote === 'A'
                    ? 'bg-[#D4AF37] text-[#1B2A4A] border-[#D4AF37] shadow-md'
                    : 'bg-white/8 text-[#D4AF37] border-[#D4AF37]/20'
                }`}>
                {proSide}
              </button>
              <button onClick={() => handleVote('B')} disabled={isVoting || isParticipant}
                className={`flex-1 py-3 font-sans font-bold rounded-xl text-sm transition-all active:scale-95 disabled:opacity-40 border ${
                  myVote === 'B'
                    ? 'bg-[#D4AF37] text-[#1B2A4A] border-[#D4AF37] shadow-md'
                    : 'bg-white/8 text-[#D4AF37] border-[#D4AF37]/20'
                }`}>
                {conSide}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-end px-1">
              <div className="flex flex-col">
                <span className={`text-[11px] font-bold tracking-wide ${myVote === 'A' ? 'text-emerald-400' : 'text-white/30'}`}>
                  {myVote === 'A' ? '✓ ' : ''}{proSide}
                </span>
                <span className="text-xl font-black text-white">{percentA}%</span>
                <span className="text-[10px] text-white/25">{voteCounts.A.toLocaleString()}명</span>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-[11px] font-bold tracking-wide ${myVote === 'B' ? 'text-red-400' : 'text-white/30'}`}>
                  {myVote === 'B' ? '✓ ' : ''}{conSide}
                </span>
                <span className="text-xl font-black text-white">{percentB}%</span>
                <span className="text-[10px] text-white/25">{voteCounts.B.toLocaleString()}명</span>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 rounded-l-full transition-all duration-1000" style={{ width: `${percentA}%` }} />
              <div className="h-full bg-red-500 rounded-r-full transition-all duration-1000" style={{ width: `${percentB}%` }} />
            </div>
            <div className="flex justify-between px-1 text-[11px] text-white/25 font-bold">
              <span>총 {totalVotes.toLocaleString()}명 참여</span>
              {isClosed ? (
                <span className="text-red-400/60 text-[10px] font-bold">투표마감</span>
              ) : myVote ? (
                <button onClick={() => handleVote(myVote)} disabled={isVoting}
                  className="flex items-center gap-1 text-[#D4AF37]/40 hover:text-[#D4AF37]/70 transition-colors disabled:opacity-30">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                  </svg>
                  다시하기
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* 하단: 좋아요/댓글/조회수 + 타이머 */}
        <div className="flex justify-between items-center pt-3 border-t border-white/5">
          <div className="flex items-center gap-4">
            <button onClick={handleLike} className="flex items-center gap-1 active:scale-90 transition-transform">
              <svg fill={liked ? '#E63946' : 'none'} stroke={liked ? '#E63946' : 'white'} strokeWidth="2" height="14" viewBox="0 0 24 24" width="14" opacity={liked ? 1 : 0.4}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span className="text-[10px] font-bold text-white/40">{likeCount}</span>
            </button>
            <button onClick={() => setIsCommentOpen(true)} className="flex items-center gap-1 active:scale-90 transition-transform">
              <svg fill="none" stroke="white" strokeWidth="2" height="14" viewBox="0 0 24 24" width="14" opacity="0.4"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span className="text-[10px] font-bold text-white/40">{commentCount}</span>
            </button>
            <div className="flex items-center gap-1">
              <svg fill="none" stroke="white" strokeWidth="2" height="14" viewBox="0 0 24 24" width="14" opacity="0.3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span className="text-[10px] font-bold text-white/30">{totalVotes}</span>
            </div>
          </div>
          <span className={`text-[11px] font-black font-mono ${isClosed ? 'text-white/20' : 'text-[#D4AF37]'}`}>
            {isClosed ? 'CLOSED' : timeLeft}
          </span>
        </div>
      </div>
    </div>

    <CommentBottomSheet
      isOpen={isCommentOpen}
      onClose={() => setIsCommentOpen(false)}
      debateId={debateId}
      onCountChange={setCommentCount}
    />
    <LoginPromptModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} redirectTo="/" />
    <MoragoraModal
      isOpen={modalState.isOpen}
      onClose={closeModal}
      title={modalState.title}
      description={modalState.description}
      type="error"
    />
    </>
  );
});

// 슬라이드 화살표 버튼
function SlideArrow({ direction, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`absolute top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/15 border border-white/20 flex items-center justify-center transition-all backdrop-blur-sm
        ${disabled ? 'opacity-0 pointer-events-none' : 'opacity-80 hover:opacity-100 hover:bg-white/25 active:scale-90'}
        ${direction === 'left' ? 'left-2' : 'right-2'}`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {direction === 'left'
          ? <polyline points="15 18 9 12 15 6"/>
          : <polyline points="9 6 15 12 9 18"/>
        }
      </svg>
    </button>
  );
}

// 배너 래퍼 컴포넌트
export default function TodayDebate({ items = [], myVotesMap = {} }) {
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
      if (diff > 0) goTo(currentIndex + 1);
      else goTo(currentIndex - 1);
    }
    startXRef.current = null;
  };

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
    <div className="px-5 pt-3 pb-1">
      {/* 슬라이드 영역 (화살표 포함) */}
      <div className="relative">
        {/* 카드 영역 */}
        <div
          ref={containerRef}
          className="overflow-hidden cursor-grab active:cursor-grabbing select-none rounded-2xl"
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
                <DebateBannerCard item={item} initialVote={myVotesMap[item?.debate_id]} />
              </div>
            ))}
          </div>
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
                backgroundColor: i === currentIndex ? '#1B2A4A' : '#D4AF37',
                opacity: i === currentIndex ? 1 : 0.3,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
