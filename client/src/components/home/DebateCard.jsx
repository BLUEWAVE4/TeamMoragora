import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';
import { castVote, getVoteTally, cancelVote, incrementDebateView } from '../../services/api';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvatarUrl, DEFAULT_AVATAR_ICON } from '../../utils/avatar';

// created_at + vote_duration(일) → 카운트다운 훅
function useVoteCountdown(createdAt, voteDuration) {
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (!createdAt || !voteDuration) return;
    const totalMs = Number(voteDuration) * 24 * 60 * 60 * 1000;
    const deadline = new Date(new Date(createdAt).getTime() + totalMs);
    const pad = (n) => String(n).padStart(2, '0');
    const update = () => {
      const diff = deadline.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ expired: true, progressRatio: 0, label: '00:00:00' }); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ expired: false, progressRatio: Math.min(diff / totalMs, 1), label: `${pad(h)}:${pad(m)}:${pad(s)}` });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [createdAt, voteDuration]);
  return timeLeft;
}

export default function DebateCard({ feed, formatTime }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const debateData = feed?.debate || feed || {};
  const debateStatus = debateData?.status;
  const isVotingStatus = debateStatus === 'voting';
  const isCompleted = debateStatus === 'completed';

  // 카운트다운
  const voteDuration = debateData?.vote_duration ?? null;
  const timeLeft = useVoteCountdown(debateData?.created_at, voteDuration);
  const hasTimer = !!voteDuration;
  const timerExpired = timeLeft?.expired === true;
  const isClosed = !isVotingStatus || timerExpired;
  const canVote = isVotingStatus && !timerExpired;

  const barColor = !timeLeft || timeLeft.progressRatio > 0.5 ? '#10b981'
    : timeLeft.progressRatio > 0.2 ? '#f59e0b' : '#ef4444';

  const [optionAText, setOptionAText] = useState(debateData?.pro_side || feed?.pro_side || "");
  const [optionBText, setOptionBText] = useState(debateData?.con_side || feed?.con_side || "");

  useEffect(() => {
    if (optionAText && optionBText) return;
    const debateId = feed?.debate_id || debateData?.id;
    if (!debateId) return;
    const fetchSides = async () => {
      try {
        const { data } = await supabase.from('debates').select('pro_side, con_side').eq('id', debateId).single();
        if (data?.pro_side) setOptionAText(data.pro_side);
        if (data?.con_side) setOptionBText(data.con_side);
      } catch (e) { console.log('fetch 실패:', e); }
    };
    fetchSides();
  }, [feed?.debate_id, debateData?.id]);

  const storageKey = `my_vote_${feed?.debate_id || debateData?.id}_${user?.id}`;
  const savedVote = localStorage.getItem(storageKey);

  const [myVote, setMyVote] = useState(savedVote || null);
  const [voteCounts, setVoteCounts] = useState({
    agree: feed?.citizen_score_a ?? 0,
    disagree: feed?.citizen_score_b ?? 0,
  });
  const [isVoting, setIsVoting] = useState(false);

  // 좋아요 및 댓글 상태
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(0);
  const [sideUsers, setSideUsers] = useState({ A: null, B: null });
  const commentInputRef = useRef(null);

<<<<<<< HEAD
  // ✅ 조회수 state — page_views 테이블에서 직접 fetch
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    const debateId = feed?.debate_id || debateData?.id;
    if (!debateId) return;
    const fetchViewCount = async () => {
      try {
        const { count } = await supabase
          .from('page_views')
          .select('*', { count: 'exact', head: true })
          .eq('path', `/moragora/${debateId}`);
        setViewCount(count ?? 0);
      } catch (e) { console.log('조회수 fetch 실패:', e); }
    };
    fetchViewCount();
  }, [feed?.debate_id, debateData?.id]);
=======
  const [viewCount, setViewCount] = useState(debateData?.view_count || 0);
>>>>>>> 36700ebd087364bb76c706d072daf60dce2d583e

  const categoryIconMap = {
    '사회': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    '기술': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    '철학': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>,
    '연애': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    '일상': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    '정치': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2D3350" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
    '기타': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  };

  useEffect(() => {
    const debateId = feed?.debate_id || debateData?.id;
    if (!debateId) return;
    const fetchVoteCounts = async () => {
      try {
        const res = await getVoteTally(debateId);
        setVoteCounts({ agree: res?.A ?? 0, disagree: res?.B ?? 0 });
      } catch (err) { console.log('에러:', err); }
    };
    fetchVoteCounts();
  }, [feed?.debate_id, debateData?.id]);

  useEffect(() => {
    const debateId = feed?.debate_id || debateData?.id;
    if (!debateId) return;
    const fetchLikeData = async () => {
      try {
        const { count } = await supabase.from('debate_likes').select('*', { count: 'exact', head: true }).eq('debate_id', debateId);
        setLikeCount(count ?? 0);
        if (user) {
          const { data } = await supabase.from('debate_likes').select('id').eq('debate_id', debateId).eq('user_id', user.id).maybeSingle();
          setLiked(!!data);
        }
      } catch (e) { console.log('좋아요 실패:', e); }
    };
    fetchLikeData();
  }, [feed?.debate_id, debateData?.id, user]);

  useEffect(() => {
    const debateId = feed?.debate_id || debateData?.id;
    if (!debateId) return;
    const fetchCommentCount = async () => {
      try {
        const { count } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('debate_id', debateId);
        setLocalCommentCount(count ?? 0);
      } catch (e) { console.log('댓글 실패:', e); }
    };
    fetchCommentCount();
  }, [feed?.debate_id, debateData?.id]);

  useEffect(() => {
    const debateId = feed?.debate_id || debateData?.id;
    if (!isCommentOpen || !debateId) return;
    const fetchComments = async () => {
      try {
        const [{ data }, { data: args }] = await Promise.all([
          supabase.from('comments').select('*, profiles(nickname, gender, avatar_url)').eq('debate_id', debateId).order('created_at', { ascending: true }),
          supabase.from('arguments').select('side, user_id').eq('debate_id', debateId),
        ]);
        setComments(data || []);
        setLocalCommentCount(data?.length ?? 0);
        if (args) {
          const a = args.find(x => x.side === 'A');
          const b = args.find(x => x.side === 'B');
          setSideUsers({ A: a?.user_id || null, B: b?.user_id || null });
        }
      } catch (e) { console.log('댓글 fetch 실패:', e); }
    };
    fetchComments();
    setTimeout(() => commentInputRef.current?.focus(), 300);
  }, [isCommentOpen, feed?.debate_id, debateData?.id]);

  if (!feed) return null;

  const topic = debateData?.topic || "제목 없는 논쟁";
  const isMe = user && (debateData?.creator_id === user.id);
  const isParticipant = user && (debateData?.creator_id === user.id || debateData?.opponent_id === user.id);
  const creatorNickname = debateData?.creator?.nickname || (isMe ? (user.user_metadata?.nickname || "나") : "익명");

  const purposeMap = { 'compete': '경쟁', 'fun': '재미', 'resolve': '해결', 'learn': '학습' };
  const lensMap = { 'general': '종합', 'logic': '논리', 'emotion': '감정', 'practical': '실용', 'ethics': '윤리', 'creative': '자유' };
  const purpose = purposeMap[debateData?.purpose] || '';
  const lens = lensMap[debateData?.lens] || '';

  const categoryMap = {
    'WORK': '직장', 'DAILY': '일상', 'SOCIETY': '사회', 'ROMANCE': '연애', 'LOVE': '연애',
    'EDUCATION': '교육', 'TECHNOLOGY': '기술', 'POLITICS': '정치', 'PHILOSOPHY': '철학',
    'CULTURE': '문화', 'ECONOMY': '경제',
  };
  const categoryName = categoryMap[debateData?.category?.toUpperCase()] || debateData?.category || '일상';
  const categoryIcon = categoryIconMap[categoryName] || categoryIconMap['기타'];

  const totalVotes = voteCounts.agree + voteCounts.disagree;
  const agreePercent = totalVotes === 0 ? 0 : Math.round((voteCounts.agree / totalVotes) * 100);
  const disagreePercent = totalVotes === 0 ? 0 : 100 - agreePercent;

  const handleVote = async (side) => {
    const debateId = feed?.debate_id || debateData?.id;
    if (!user) { alert('로그인이 필요합니다.'); return; }
    if (isVoting || !canVote || isParticipant) return;
    const isCanceling = myVote === side;
    const prevVote = myVote;
    const prevCounts = { ...voteCounts };
    const nextVote = isCanceling ? null : side;
    setMyVote(nextVote);
    if (nextVote) localStorage.setItem(storageKey, nextVote);
    else localStorage.removeItem(storageKey);
    setVoteCounts(prev => {
      const next = { ...prev };
      if (isCanceling) next[side === 'A' ? 'agree' : 'disagree'] = Math.max(0, next[side === 'A' ? 'agree' : 'disagree'] - 1);
      else if (prevVote === null) next[side === 'A' ? 'agree' : 'disagree'] += 1;
      else {
        next[prevVote === 'A' ? 'agree' : 'disagree'] = Math.max(0, next[prevVote === 'A' ? 'agree' : 'disagree'] - 1);
        next[side === 'A' ? 'agree' : 'disagree'] += 1;
      }
      return next;
    });
    setIsVoting(true);
    try {
      if (isCanceling) await cancelVote(debateId);
      else await castVote(debateId, side);
    } catch (err) {
      setMyVote(prevVote);
      setVoteCounts(prevCounts);
      alert('투표 처리에 실패했습니다.');
    } finally { setIsVoting(false); }
  };

  const handleLike = async () => {
    const debateId = feed?.debate_id || debateData?.id;
    if (!user) { alert('로그인이 필요합니다.'); return; }
    if (isLiking) return;
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prev => prevLiked ? Math.max(0, prev - 1) : prev + 1);
    setIsLiking(true);
    try {
      if (prevLiked) await supabase.from('debate_likes').delete().eq('debate_id', debateId).eq('user_id', user.id);
      else await supabase.from('debate_likes').insert({ debate_id: debateId, user_id: user.id });
    } catch (err) { setLiked(prevLiked); setLikeCount(prevCount); } finally { setIsLiking(false); }
  };

  const handleSendComment = async () => {
    const debateId = feed?.debate_id || debateData?.id;
    if (!user || !commentText.trim() || isSendingComment) return;
    setIsSendingComment(true);
    try {
      const { data, error } = await supabase.from('comments').insert({
        debate_id: debateId,
        user_id: user.id,
        content: commentText.trim(),
      }).select('*, profiles(nickname)').single();
      if (error) throw error;
      setComments(prev => [...prev, data]);
      setCommentText('');
      setLocalCommentCount(prev => prev + 1);
    } catch (e) { alert('실패'); } finally { setIsSendingComment(false); }
  };

  // ✅ 상세보기 클릭 시 조회수 +1 (중복 방지)
  const handleDetailClick = async () => {
    const debateId = feed?.debate_id || debateData?.id;
    if (!debateId) return;

    // 같은 세션에서 이미 조회한 경우 중복 insert 방지
    const viewKey = `viewed_${debateId}`;
    const alreadyViewed = sessionStorage.getItem(viewKey);

    if (!alreadyViewed) {
      sessionStorage.setItem(viewKey, 'true');
      setViewCount(prev => prev + 1);
      try {
        await supabase.from('page_views').insert({
          path: `/moragora/${debateId}`,
          user_id: user?.id ?? null,
          session_id: crypto.randomUUID(),
        });
      } catch (e) {
        console.error('❌ 조회수 기록 실패:', e);
        sessionStorage.removeItem(viewKey);
      }
    }

    navigate(`/moragora/${debateId}`, {
      state: { userVote: myVote, agreeText: optionAText, disagreeText: optionBText }
    });
  };

  const formatCommentTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return '방금';
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
    return `${d.getMonth() + 1}.${d.getDate()}`;
  };

  return (
    <>
      <div className="w-full font-sans pb-5 mb-1 bg-white/70 rounded-xl">

        {/* 프로필 헤더 */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1B2A4A]/5 flex-shrink-0">
            <img
              src={debateData?.creator?.avatar_url || getAvatarUrl(debateData?.creator_id, debateData?.creator?.gender) || DEFAULT_AVATAR_ICON}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-[#1B2A4A] truncate">{creatorNickname}</span>
            {(() => {
              const tier = debateData?.creator?.tier || '시민';
              const tierColor = { '시민': '#8E8E93', '배심원': '#007AFF', '변호사': '#AF52DE', '판사': '#FF9500', '대법관': '#FF3B30' };
              const tierBg = { '시민': '#F5F5F7', '배심원': '#EBF5FF', '변호사': '#F9F0FF', '판사': '#FFF5EB', '대법관': '#FFF0EF' };
              return (
                <span
                  className="text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ color: tierColor[tier] || '#8E8E93', backgroundColor: tierBg[tier] || '#F5F5F7' }}
                >{tier}</span>
              );
            })()}
          </div>
          <button onClick={handleDetailClick} className="w-11 h-11 rounded-full flex items-center justify-center text-[#D4AF37] active:bg-[#D4AF37]/10 active:scale-90 transition-all flex-shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 6 15 12 9 18"/></svg>
          </button>
        </div>

        <div className="mx-4 border-b border-[#1B2A4A]/5" />

        {/* 주제 */}
        <div className="px-4 pt-3 pb-1">
          <h3 className="text-[19px] font-sans font-black text-[#1B2A4A] leading-[1.45] break-keep tracking-tight">{topic}</h3>
        </div>

        {/* 카테고리 + 목적 + 렌즈 뱃지 + 타이머 뱃지 */}
        <div className="px-4 pb-2 flex items-center gap-1 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1B2A4A]/8 text-[#1B2A4A]/60 font-bold">{categoryName}</span>
          {purpose && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1B2A4A]/8 text-[#1B2A4A]/50 font-bold">{purpose}</span>}
          {lens && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] font-bold">{lens}</span>}
          {hasTimer && timerExpired && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 font-bold">투표 마감</span>
          )}
        </div>

        {/* 투표 진행 바 (vote_duration 있을 때만) */}
        {hasTimer && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-[#1B2A4A]/30 uppercase tracking-wider">
                {timerExpired ? '투표 마감' : '투표 진행 중'}
              </span>
              {!timerExpired && timeLeft && (
                <span className="text-[9px] font-bold" style={{ color: barColor }}>
                  {timeLeft.label}
                </span>
              )}
            </div>
            <div className="w-full h-1 bg-[#1B2A4A]/8 rounded-full overflow-hidden">
              {timerExpired ? (
                <div className="h-full w-full bg-[#1B2A4A]/10 rounded-full" />
              ) : (
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${(timeLeft?.progressRatio ?? 1) * 100}%`,
                    backgroundColor: barColor,
                    boxShadow: `0 0 4px ${barColor}50`,
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* 투표 섹션 */}
        <div className="px-4 pb-4 pt-1">
          <div className="flex flex-col gap-2">
            {isParticipant && isVotingStatus && (
              <p className="text-[10px] text-center text-[#1B2A4A]/25 font-bold">논쟁 당사자는 투표할 수 없습니다</p>
            )}
            {/* A측 */}
            <button
              onClick={() => handleVote('A')}
              disabled={isVoting || !canVote || isParticipant}
              className={`relative h-11 w-full rounded-lg overflow-hidden transition-all active:scale-[0.98] border
                ${myVote === 'A' ? 'border-emerald-400/60 bg-emerald-50/50' : 'border-[#1B2A4A]/10'}
                ${(!canVote || isParticipant) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {(myVote || isCompleted) && totalVotes > 0 && (
                <motion.div initial={{ width: 0 }} animate={{ width: `${agreePercent}%` }} className="absolute inset-y-0 left-0 bg-emerald-500/8" />
              )}
              <div className="relative h-full px-3.5 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isCompleted || timerExpired ? 'bg-[#1B2A4A]/10 text-[#1B2A4A]/45' :
                    myVote === 'A' ? 'bg-emerald-500 text-white' : 'bg-[#1B2A4A]/8 text-[#1B2A4A]/50'
                  }`}>{isCompleted || timerExpired ? '마감' : 'A측'}</span>
                  <span className={`text-[13px] font-bold ${myVote === 'A' ? 'text-emerald-600' : 'text-[#1B2A4A]/70'}`}>{optionAText || "찬성"}</span>
                </div>
                {(myVote || isCompleted) && (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#1B2A4A]/80">{agreePercent}%</span>
                    <span className="text-[9px] text-[#1B2A4A]/45">{voteCounts.agree}표</span>
                  </div>
                )}
              </div>
            </button>

            {/* B측 */}
            <button
              onClick={() => handleVote('B')}
              disabled={isVoting || !canVote || isParticipant}
              className={`relative h-11 w-full rounded-lg overflow-hidden transition-all active:scale-[0.98] border
                ${myVote === 'B' ? 'border-red-400/60 bg-red-50/50' : 'border-[#1B2A4A]/10'}
                ${(!canVote || isParticipant) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {(myVote || isCompleted) && totalVotes > 0 && (
                <motion.div initial={{ width: 0 }} animate={{ width: `${disagreePercent}%` }} className="absolute inset-y-0 left-0 bg-red-500/8" />
              )}
              <div className="relative h-full px-3.5 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isCompleted || timerExpired ? 'bg-[#1B2A4A]/10 text-[#1B2A4A]/45' :
                    myVote === 'B' ? 'bg-red-500 text-white' : 'bg-[#1B2A4A]/8 text-[#1B2A4A]/50'
                  }`}>{isCompleted || timerExpired ? '마감' : 'B측'}</span>
                  <span className={`text-[13px] font-bold ${myVote === 'B' ? 'text-red-500' : 'text-[#1B2A4A]/70'}`}>{optionBText || "반대"}</span>
                </div>
                {(myVote || isCompleted) && (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#1B2A4A]/80">{disagreePercent}%</span>
                    <span className="text-[9px] text-[#1B2A4A]/45">{voteCounts.disagree}표</span>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* 하단 액션 바 */}
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-5">
            {/* 좋아요 */}
            <button onClick={handleLike} disabled={isLiking} className="flex items-center gap-1.5 active:scale-90 transition-transform">
              <svg fill={liked ? '#E63946' : 'none'} stroke={liked ? '#E63946' : '#1B2A4A'} strokeWidth="2" height="18" viewBox="0 0 24 24" width="18" opacity={liked ? 1 : 0.5}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span className="text-[12px] font-bold text-[#1B2A4A]/60">{likeCount}</span>
            </button>
            <button onClick={() => setIsCommentOpen(true)} className="flex items-center gap-1.5 active:scale-90 transition-transform">
              <svg fill="none" stroke="#1B2A4A" strokeWidth="2" height="18" viewBox="0 0 24 24" width="18" opacity="0.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span className="text-[12px] font-bold text-[#1B2A4A]/60">{localCommentCount}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <svg fill="none" stroke="#1B2A4A" strokeWidth="2" height="18" viewBox="0 0 24 24" width="18" opacity="0.4">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span className="text-[12px] font-bold text-[#1B2A4A]/50">{viewCount}</span>
            </div>
          </div>
          <span className="text-[10px] text-[#1B2A4A]/40 font-bold">{formatTime ? formatTime(feed.created_at) : ''}</span>
        </div>
      </div>

      {/* 시민 의견 바텀시트 */}
      <AnimatePresence>
        {isCommentOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCommentOpen(false)} className="fixed inset-0 bg-black/40 z-[200]" />
            <div className="fixed inset-0 z-[201] flex items-end justify-center pointer-events-none">
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="w-full max-w-[440px] bg-gradient-to-b from-[#F5F0E8] to-white rounded-t-2xl max-h-[70vh] flex flex-col shadow-xl pointer-events-auto"
              >
                {/* 핸들 + 헤더 */}
                <div className="flex-shrink-0 px-5 pt-3 pb-3 border-b border-[#D4AF37]/10">
                  <div className="w-10 h-1 bg-[#1B2A4A]/10 rounded-full mx-auto mb-3" />
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-bold text-[#1B2A4A]">시민 의견 <span className="text-[11px] text-[#1B2A4A]/40 ml-1">{localCommentCount}개</span></h3>
                    <button onClick={() => setIsCommentOpen(false)} className="text-[#1B2A4A]/30 text-[12px] font-bold">닫기</button>
                  </div>
                </div>

                {/* 의견 목록 */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                  {comments.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[13px] text-[#1B2A4A]/30">아직 의견이 없습니다</p>
                      <p className="text-[11px] text-[#1B2A4A]/20 mt-1">이 판결에 대한 의견을 남겨보세요</p>
                    </div>
                  ) : (
                    comments.map((c) => {
                      const nickname = c.profiles?.nickname || '익명';
                      const isMine = user?.id === c.user_id;
                      return (
                        <div key={c.id} className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1B2A4A]/10 shrink-0">
                            <img
                              src={c.profiles?.avatar_url || getAvatarUrl(c.user_id, c.profiles?.gender) || DEFAULT_AVATAR_ICON}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className={`flex-1 min-w-0 ${isMine ? 'text-right' : ''}`}>
                            <div className={`flex items-center gap-1.5 ${isMine ? 'justify-end' : ''}`}>
                              <span className="text-[12px] font-bold text-[#1B2A4A]">{nickname}</span>
                              {c.user_id === sideUsers.A && (
                                <span className="text-[9px] text-white bg-emerald-500 px-1.5 py-0.5 rounded-full font-bold">A측</span>
                              )}
                              {c.user_id === sideUsers.B && (
                                <span className="text-[9px] text-white bg-red-500 px-1.5 py-0.5 rounded-full font-bold">B측</span>
                              )}
                              <span className="text-[10px] text-[#1B2A4A]/25">{formatCommentTime(c.created_at)}</span>
                            </div>
                            <div className={`flex items-end gap-1.5 mt-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                              <div className={`px-3 py-2 rounded-2xl max-w-[75%] ${isMine ? 'bg-[#1B2A4A]/8 rounded-tr-sm' : 'bg-[#1B2A4A]/5 rounded-tl-sm'}`}>
                                <p className="text-[12px] text-[#1B2A4A]/70 leading-[1.6] break-words text-left">{c.content}</p>
                              </div>
                              {isMine && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase.from('comments').delete().eq('id', c.id);
                                      if (!error) {
                                        setComments(prev => prev.filter(x => x.id !== c.id));
                                        setLocalCommentCount(prev => prev - 1);
                                      }
                                    } catch {}
                                  }}
                                  className="text-[9px] text-[#1B2A4A]/15 active:text-red-400 transition-colors shrink-0 pb-0.5"
                                >
                                  삭제
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 입력창 */}
                <div className="flex-shrink-0 px-4 py-3 border-t border-[#D4AF37]/10 flex items-center gap-2" style={{ paddingBottom: `max(12px, env(safe-area-inset-bottom))` }}>
                  {user && (
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1B2A4A]/10 shrink-0">
                      <img
                        src={getAvatarUrl(user.id, user.user_metadata?.gender) || DEFAULT_AVATAR_ICON}
                        alt=""
                        className="w-full h-full object-cover"
                      />
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
                    disabled={!commentText.trim() || isSendingComment || !user}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      commentText.trim() ? 'bg-[#D4AF37] text-white' : 'bg-[#D4AF37]/20 text-[#D4AF37]/40'
                    }`}
                  >
                    {isSendingComment
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <span className="text-[14px] font-bold">↑</span>
                    }
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}