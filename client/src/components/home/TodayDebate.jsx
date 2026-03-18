import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../store/AuthContext';
import { castVote, getVoteTally, cancelVote } from '../../services/api';
import { supabase } from '../../services/supabase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AI_JUDGES } from '../../constants/judges';
import { getAvatarUrl, DEFAULT_AVATAR_ICON } from '../../utils/avatar';

// 개별 카드 컴포넌트
function DebateBannerCard({ item }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const debateId = item?.debate_id;
  const isVotingStatus = item?.debate?.status === 'voting';
  const isCompleted = item?.debate?.status === 'completed';
  const storageKey = `today_vote_${debateId}_${user?.id}`;
  const savedVote = localStorage.getItem(storageKey);

  const [myVote, setMyVote] = useState(savedVote || null);
  const [voteCounts, setVoteCounts] = useState({ A: 0, B: 0 });
  const [isVoting, setIsVoting] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [voteExpired, setVoteExpired] = useState(false);

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
        setTimeLeft('00:00:00');
        setVoteExpired(true);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${pad(h)}:${pad(m)}:${pad(s)}`);
      setVoteExpired(false);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [item?.debate?.created_at, item?.created_at, item?.debate?.vote_duration]);

  const handleVote = async (side) => {
    if (!user) { alert('로그인이 필요합니다.'); return; }
    if (isVoting || !isVotingStatus || isParticipant || voteExpired) return;

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

  // 좋아요/댓글/조회수
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    if (!debateId) return;
    const fetchCounts = async () => {
      try {
        const [{ count: lc }, { count: cc }] = await Promise.all([
          supabase.from('debate_likes').select('*', { count: 'exact', head: true }).eq('debate_id', debateId),
          supabase.from('comments').select('*', { count: 'exact', head: true }).eq('debate_id', debateId),
        ]);
        setLikeCount(lc ?? 0);
        setCommentCount(cc ?? 0);
        if (user) {
          const { data: myLike } = await supabase.from('debate_likes').select('id').eq('debate_id', debateId).eq('user_id', user.id).maybeSingle();
          setLiked(!!myLike);
        }
      } catch {}
    };
    fetchCounts();
  }, [debateId, user]);

  const handleLike = async () => {
    if (!user) return;
    const prev = liked;
    const prevCount = likeCount;
    setLiked(!prev);
    setLikeCount(prev ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      if (prev) await supabase.from('debate_likes').delete().eq('debate_id', debateId).eq('user_id', user.id);
      else await supabase.from('debate_likes').insert({ debate_id: debateId, user_id: user.id });
    } catch { setLiked(prev); setLikeCount(prevCount); }
  };

  // 댓글 바텀시트
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [myAvatarUrl, setMyAvatarUrl] = useState(null);
  const commentInputRef = useRef(null);

  // 현재 유저 아바타 URL (profiles 테이블)
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
      .then(({ data }) => { if (data?.avatar_url) setMyAvatarUrl(data.avatar_url); });
  }, [user]);

  useEffect(() => {
    if (!isCommentOpen || !debateId) return;
    const fetch = async () => {
      const { data } = await supabase.from('comments').select('*, profiles(nickname, gender, avatar_url)').eq('debate_id', debateId).order('created_at', { ascending: true });
      setComments(data || []);
      setCommentCount(data?.length ?? 0);
    };
    fetch();
    setTimeout(() => commentInputRef.current?.focus(), 300);
  }, [isCommentOpen, debateId]);

  const handleSendComment = async () => {
    if (!user || !commentText.trim() || isSending) return;
    setIsSending(true);
    try {
      const { data } = await supabase.from('comments').insert({ debate_id: debateId, user_id: user.id, content: commentText.trim() }).select('*, profiles(nickname, gender, avatar_url)').single();
      setComments(prev => [...prev, data]);
      setCommentText('');
      setCommentCount(prev => prev + 1);
    } catch {} finally { setIsSending(false); }
  };

  const formatCommentTime = (iso) => {
    if (!iso) return '';
    const diff = Math.floor((new Date() - new Date(iso)) / 60000);
    if (diff < 1) return '방금';
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
    const d = new Date(iso);
    return `${d.getMonth() + 1}.${d.getDate()}`;
  };

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

    {/* 시민 의견 바텀시트 — Portal로 body에 렌더링 */}
    {createPortal(<AnimatePresence>
      {isCommentOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCommentOpen(false)} className="fixed inset-0 bg-black/40 z-[200]" />
          <div className="fixed inset-0 z-[201] flex items-end justify-center pointer-events-none">
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="w-full max-w-[440px] bg-gradient-to-b from-[#F5F0E8] to-white rounded-t-2xl max-h-[70vh] flex flex-col shadow-xl pointer-events-auto"
            >
              <div className="flex-shrink-0 px-5 pt-3 pb-3 border-b border-[#D4AF37]/10">
                <div className="w-10 h-1 bg-[#1B2A4A]/10 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-[#1B2A4A]">시민 의견</h3>
                  <button onClick={() => setIsCommentOpen(false)} className="text-[#1B2A4A]/30 text-[12px] font-bold">닫기</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[13px] text-[#1B2A4A]/30">아직 의견이 없습니다</p>
                    <p className="text-[11px] text-[#1B2A4A]/20 mt-1">이 논쟁에 대한 의견을 남겨보세요</p>
                  </div>
                ) : comments.map((c) => {
                  const nickname = c.profiles?.nickname || '익명';
                  const isMine = user?.id === c.user_id;
                  return (
                    <div key={c.id} className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1B2A4A]/10 shrink-0">
                        <img src={c.profiles?.avatar_url || getAvatarUrl(c.user_id, c.profiles?.gender) || DEFAULT_AVATAR_ICON} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className={`flex-1 min-w-0 ${isMine ? 'text-right' : ''}`}>
                        <div className={`flex items-center gap-1.5 ${isMine ? 'justify-end' : ''}`}>
                          <span className="text-[12px] font-bold text-[#1B2A4A]">{nickname}</span>
                          <span className="text-[10px] text-[#1B2A4A]/25">{formatCommentTime(c.created_at)}</span>
                        </div>
                        <div className={`flex items-end gap-1.5 mt-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                          <div className={`px-3 py-2 rounded-2xl max-w-[75%] ${isMine ? 'bg-[#1B2A4A]/8 rounded-tr-sm' : 'bg-[#1B2A4A]/5 rounded-tl-sm'}`}>
                            <p className="text-[12px] text-[#1B2A4A]/70 leading-[1.6] break-words text-left">{c.content}</p>
                          </div>
                          {isMine && (
                            <button
                              onClick={async () => {
                                await supabase.from('comments').delete().eq('id', c.id);
                                setComments(prev => prev.filter(x => x.id !== c.id));
                                setCommentCount(prev => prev - 1);
                              }}
                              className="text-[9px] text-[#1B2A4A]/15 active:text-red-400 transition-colors shrink-0 pb-0.5"
                            >삭제</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex-shrink-0 px-4 py-3 border-t border-[#D4AF37]/10 flex items-center gap-2" style={{ paddingBottom: `max(12px, env(safe-area-inset-bottom))` }}>
                {user && (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1B2A4A]/10 shrink-0">
                    <img src={myAvatarUrl || getAvatarUrl(user.id, user.user_metadata?.gender) || DEFAULT_AVATAR_ICON} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <input
                  ref={commentInputRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                  placeholder={user ? "의견을 입력하세요..." : "로그인 후 의견을 남길 수 있어요"}
                  disabled={!user}
                  maxLength={500}
                  className="flex-1 h-9 bg-[#1B2A4A]/5 rounded-full px-4 text-[12px] text-[#1B2A4A] placeholder:text-[#1B2A4A]/25 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!commentText.trim() || isSending || !user}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    commentText.trim() ? 'bg-[#D4AF37] text-white' : 'bg-[#D4AF37]/20 text-[#D4AF37]/40'
                  }`}
                >
                  {isSending ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="text-[14px] font-bold">↑</span>}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>, document.body)}
    </>
  );
}

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
    <div className="px-5 pt-3 pb-6">
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
                <DebateBannerCard item={item} />
              </div>
            ))}
          </div>
        </div>

        {/* 좌우 화살표 (카드 위에 오버레이) */}
        {validItems.length > 1 && (
          <>
            <SlideArrow direction="left" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} />
            <SlideArrow direction="right" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === validItems.length - 1} />
          </>
        )}
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
