import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';
import { castVote, getVoteTally, cancelVote } from '../../services/api';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function DebateCard({ feed, formatTime }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const debateData = feed?.debate || feed || {};
  const debateStatus = debateData?.status;
  const isVotingStatus = debateStatus === 'voting';
  const isCompleted = debateStatus === 'completed';

  // 투표 마감 시간 계산
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    // vote_deadline 컬럼 우선, 없으면 created_at + 24시간
    const deadline = debateData?.vote_deadline
      ? new Date(debateData.vote_deadline).getTime()
      : debateData?.created_at
        ? new Date(debateData.created_at).getTime() + (24 * 60 * 60 * 1000)
        : null;

    if (!isVotingStatus || !deadline) return;

    const tick = () => {
      const diff = deadline - new Date().getTime();
      if (diff <= 0) { setTimeLeft("마감 임박"); return; }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${h}시간 ${m}분 ${s}초 남음`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isVotingStatus, debateData?.vote_deadline, debateData?.created_at]);

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
  const commentInputRef = useRef(null);

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
        const { data } = await supabase.from('comments').select('*, profiles(nickname)').eq('debate_id', debateId).order('created_at', { ascending: true });
        setComments(data || []);
        setLocalCommentCount(data?.length ?? 0);
      } catch (e) { console.log('댓글 fetch 실패:', e); }
    };
    fetchComments();
    setTimeout(() => commentInputRef.current?.focus(), 300);
  }, [isCommentOpen, feed?.debate_id, debateData?.id]);

  if (!feed) return null;

  const topic = debateData?.topic || "제목 없는 논쟁";
  const isMe = user && (debateData?.creator_id === user.id);
  const creatorNickname = isMe ? (user.user_metadata?.nickname || "나") : (debateData?.creator?.nickname || "익명");

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
    if (isVoting || !isVotingStatus) return;
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
      <div className="w-full bg-white border border-gray-100 rounded-[32px] mb-6 overflow-hidden shadow-sm font-sans">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm">
              {categoryIcon}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[16px] font-bold text-[#1a1a1a]">{creatorNickname}</span>
                {isMe && <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-white font-bold">ME</span>}
              </div>
              <span className="text-[12px] text-gray-400 font-semibold">{categoryName}</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-300 font-bold tracking-widest uppercase">
            {formatTime ? formatTime(feed.created_at) : 'JUST NOW'}
          </p>
        </div>

        {/* 본문 제목 */}
        <div className="px-7 py-2 pb-4">
          <h3 className="text-[20px] font-bold text-[#1C1C1E] leading-tight break-keep">{topic}</h3>
        </div>

        {/* 투표 섹션 */}
        <div className="px-6 pb-6 pt-2">
          {/* 상태 배지 */}
          <div className="flex items-center gap-2 mb-4">
            {isVotingStatus ? (
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-tight">{timeLeft || "투표 진행 중"}</span>
              </div>
            ) : isCompleted ? (
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
                <span className="text-[11px] font-black text-gray-500 uppercase tracking-tight">🔒 투표 마감</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">준비 중</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {/* A측 버튼 */}
            <button
              onClick={() => handleVote('A')}
              disabled={isVoting || !isVotingStatus}
              className={`relative h-16 w-full rounded-2xl overflow-hidden transition-all active:scale-[0.98] border-2 
                ${myVote === 'A' ? 'border-[#34C759] bg-[#34C759]/5' : 'border-slate-100 bg-white'}
                ${!isVotingStatus ? 'opacity-70' : ''}`}
            >
              {(myVote || isCompleted) && totalVotes > 0 && (
                <motion.div initial={{ width: 0 }} animate={{ width: `${agreePercent}%` }} className="absolute inset-y-0 left-0 bg-[#34C759]/10" />
              )}
              <div className="relative h-full px-5 flex items-center justify-between z-10">
                <div className="flex items-center gap-2.5">
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${myVote === 'A' ? 'bg-[#34C759] text-white' : 'bg-slate-100 text-slate-400'}`}>A측</span>
                  <span className={`text-[16px] font-bold ${myVote === 'A' ? 'text-[#34C759]' : 'text-slate-700'}`}>{optionAText || "찬성"}</span>
                </div>
                {(myVote || isCompleted) && (
                  <div className="flex flex-col items-end">
                    <span className="text-[16px] font-black text-slate-900">{agreePercent}%</span>
                    <span className="text-[10px] font-bold text-slate-400">{voteCounts.agree.toLocaleString()}표</span>
                  </div>
                )}
              </div>
            </button>

            {/* B측 버튼 */}
            <button
              onClick={() => handleVote('B')}
              disabled={isVoting || !isVotingStatus}
              className={`relative h-16 w-full rounded-2xl overflow-hidden transition-all active:scale-[0.98] border-2 
                ${myVote === 'B' ? 'border-[#FF3B30] bg-[#FF3B30]/5' : 'border-slate-100 bg-white'}
                ${!isVotingStatus ? 'opacity-70' : ''}`}
            >
              {(myVote || isCompleted) && totalVotes > 0 && (
                <motion.div initial={{ width: 0 }} animate={{ width: `${disagreePercent}%` }} className="absolute inset-y-0 left-0 bg-[#FF3B30]/10" />
              )}
              <div className="relative h-full px-5 flex items-center justify-between z-10">
                <div className="flex items-center gap-2.5">
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${myVote === 'B' ? 'bg-[#FF3B30] text-white' : 'bg-slate-100 text-slate-400'}`}>B측</span>
                  <span className={`text-[16px] font-bold ${myVote === 'B' ? 'text-[#FF3B30]' : 'text-slate-700'}`}>{optionBText || "반대"}</span>
                </div>
                {(myVote || isCompleted) && (
                  <div className="flex flex-col items-end">
                    <span className="text-[16px] font-black text-slate-900">{disagreePercent}%</span>
                    <span className="text-[10px] font-bold text-slate-400">{voteCounts.disagree.toLocaleString()}표</span>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* 하단 액션 바 */}
        <div className="px-6 py-4 flex justify-between items-center border-t border-gray-50 bg-gray-50/30">
          <div className="flex items-center gap-5">
            {/* 좋아요 */}
            <button onClick={handleLike} disabled={isLiking} className="flex items-center gap-1.5 active:scale-90 transition-transform">
              <svg fill={liked ? '#FF3B30' : 'none'} stroke={liked ? '#FF3B30' : '#262626'} strokeWidth="2.5" height="19" viewBox="0 0 24 24" width="19"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span className="text-[13px] font-black">{likeCount}</span>
            </button>
            {/* 댓글 */}
            <button onClick={() => setIsCommentOpen(true)} className="flex items-center gap-1.5 active:scale-90 transition-transform">
              <svg fill="none" stroke="#262626" strokeWidth="2.5" height="19" viewBox="0 0 24 24" width="19"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span className="text-[13px] font-black">{localCommentCount}</span>
            </button>
            {/* ✅ 조회수 */}
            <div className="flex items-center gap-1.5 opacity-50">
              <svg fill="none" stroke="#262626" strokeWidth="2.5" height="19" viewBox="0 0 24 24" width="19">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span className="text-[13px] font-black text-[#262626]">{viewCount}</span>
            </div>
          </div>
          {/* ✅ Link → button으로 교체해서 클릭 시 조회수 기록 후 이동 */}
          <button onClick={handleDetailClick} className="text-[#007AFF] text-[14px] font-black hover:opacity-70 transition-opacity">
            상세보기
          </button>
        </div>
      </div>

      {/* 댓글 바텀시트 */}
      <AnimatePresence>
        {isCommentOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCommentOpen(false)} className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-sm" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 220 }} className="fixed bottom-0 left-0 right-0 bg-white z-[201] rounded-t-[28px] max-h-[75vh] flex flex-col shadow-2xl">
              <div className="flex-shrink-0 px-5 pt-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  <h3 className="text-[16px] font-black text-black">댓글 {localCommentCount}</h3>
                  <button onClick={() => setIsCommentOpen(false)} className="text-gray-400 text-[13px] font-bold">닫기</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                    <p className="text-[13px] font-bold">첫 댓글을 남겨보세요!</p>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-[13px] font-black text-gray-400">{(c.profiles?.nickname || '익명').charAt(0)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[13px] font-bold text-black">{c.profiles?.nickname || '익명'}</span>
                          <span className="text-[11px] text-gray-400">{formatCommentTime(c.created_at)}</span>
                        </div>
                        <p className="text-[14px] text-gray-700 leading-snug">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 flex items-center gap-3" style={{ paddingBottom: `max(12px, env(safe-area-inset-bottom))` }}>
                <input ref={commentInputRef} value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }} placeholder={user ? "댓글을 입력하세요..." : "로그인 후 댓글을 남길 수 있어요"} disabled={!user} className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-[14px] outline-none placeholder-gray-400" />
                <button onClick={handleSendComment} disabled={!commentText.trim() || isSendingComment || !user} className="w-8 h-8 rounded-full bg-[#007AFF] flex items-center justify-center">
                  {isSendingComment ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg fill="white" height="14" viewBox="0 0 24 24" width="14"><path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/></svg>}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}