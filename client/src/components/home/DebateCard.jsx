import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';
import { castVote, getVoteTally, cancelVote } from '../../services/api';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function DebateCard({ feed, formatTime }) {
  const { user } = useAuth();

  const debateStatus = feed?.debate?.status;
  const isVotingStatus = debateStatus === 'voting';

  const storageKey = `my_vote_${feed?.debate_id}_${user?.id}`;
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

  // 공유 및 기타 상태
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const viewCount = feed?.debate?.views_count || 0;

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
    if (!feed?.debate_id || !isVotingStatus) return;
    const fetchVoteCounts = async () => {
      try {
        const res = await getVoteTally(feed.debate_id);
        setVoteCounts({ agree: res?.A ?? 0, disagree: res?.B ?? 0 });
      } catch (err) { console.log('투표 현황 에러:', err); }
    };
    fetchVoteCounts();
  }, [feed?.debate_id, isVotingStatus]);

  useEffect(() => {
    if (!feed?.debate_id) return;
    const fetchLikeData = async () => {
      try {
        const { count } = await supabase.from('debate_likes').select('*', { count: 'exact', head: true }).eq('debate_id', feed.debate_id);
        setLikeCount(count ?? 0);
        if (user) {
          const { data } = await supabase.from('debate_likes').select('id').eq('debate_id', feed.debate_id).eq('user_id', user.id).maybeSingle();
          setLiked(!!data);
        }
      } catch (e) { console.log('좋아요 fetch 실패:', e); }
    };
    fetchLikeData();
  }, [feed?.debate_id, user]);

  useEffect(() => {
    if (!feed?.debate_id) return;
    const fetchCommentCount = async () => {
      try {
        const { count } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('debate_id', feed.debate_id);
        setLocalCommentCount(count ?? 0);
      } catch (e) { console.log('댓글 카운트 fetch 실패:', e); }
    };
    fetchCommentCount();
  }, [feed?.debate_id]);

  useEffect(() => {
    if (!isCommentOpen || !feed?.debate_id) return;
    const fetchComments = async () => {
      try {
        const { data } = await supabase.from('comments').select('*, profiles(nickname)').eq('debate_id', feed.debate_id).order('created_at', { ascending: true });
        setComments(data || []);
        setLocalCommentCount(data?.length ?? 0);
      } catch (e) { console.log('댓글 fetch 실패:', e); }
    };
    fetchComments();
    setTimeout(() => commentInputRef.current?.focus(), 300);
  }, [isCommentOpen, feed?.debate_id]);

  if (!feed) return null;

  const debate = feed.debate || {};
  const topic = debate.topic || "제목 없는 논쟁";
  const isMe = user && (debate.creator_id === user.id);
  const creatorNickname = isMe ? (user.user_metadata?.nickname || "나") : (debate.creator?.nickname || "익명");

  const categoryMap = {
    'WORK': '직장', 'DAILY': '일상', 'SOCIETY': '사회', 'ROMANCE': '연애', 'LOVE': '연애',
    'EDUCATION': '교육', 'TECHNOLOGY': '기술', 'POLITICS': '정치', 'PHILOSOPHY': '철학',
    'CULTURE': '문화', 'ECONOMY': '경제',
  };
  const categoryName = categoryMap[debate.category?.toUpperCase()] || debate.category || '일상';
  const categoryIcon = categoryIconMap[categoryName] || categoryIconMap['기타'];
  const debateUrl = `${window.location.origin}/debate/${feed.debate_id}`;

  const totalVotes = voteCounts.agree + voteCounts.disagree;
  const agreePercent = totalVotes === 0 ? 50 : Math.round((voteCounts.agree / totalVotes) * 100);
  const disagreePercent = 100 - agreePercent;

  const handleVote = async (side) => {
    if (!user) { alert('로그인이 필요합니다.'); return; }
    if (isVoting) return;
    const isCanceling = myVote === side;
    const prevVote = myVote;
    const prevCounts = { ...voteCounts };
    const nextVote = isCanceling ? null : side;
    setMyVote(nextVote);
    if (nextVote) localStorage.setItem(storageKey, nextVote);
    else localStorage.removeItem(storageKey);
    setVoteCounts(prev => {
      const next = { ...prev };
      if (isCanceling) next[side === 'A' ? 'agree' : 'disagree'] -= 1;
      else if (prevVote === null) next[side === 'A' ? 'agree' : 'disagree'] += 1;
      else {
        next[prevVote === 'A' ? 'agree' : 'disagree'] -= 1;
        next[side === 'A' ? 'agree' : 'disagree'] += 1;
      }
      return next;
    });
    setIsVoting(true);
    try {
      if (isCanceling) await cancelVote(feed.debate_id);
      else await castVote(feed.debate_id, side);
    } catch (err) {
      setMyVote(prevVote);
      setVoteCounts(prevCounts);
      alert('투표 처리에 실패했습니다.');
    } finally { setIsVoting(false); }
  };

  const handleLike = async () => {
    if (!user) { alert('로그인이 필요합니다.'); return; }
    if (isLiking) return;
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prev => prevLiked ? Math.max(0, prev - 1) : prev + 1);
    setIsLiking(true);
    try {
      if (prevLiked) {
        await supabase.from('debate_likes').delete().eq('debate_id', feed.debate_id).eq('user_id', user.id);
      } else {
        await supabase.from('debate_likes').insert({ debate_id: feed.debate_id, user_id: user.id });
      }
    } catch (err) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally { setIsLiking(false); }
  };

  const handleSendComment = async () => {
    if (!user) { alert('로그인이 필요합니다.'); return; }
    if (!commentText.trim() || isSendingComment) return;
    setIsSendingComment(true);
    try {
      const { data, error } = await supabase.from('comments').insert({
        debate_id: feed.debate_id,
        user_id: user.id,
        content: commentText.trim(),
      }).select('*, profiles(nickname)').single();
      if (error) throw error;
      setComments(prev => [...prev, data]);
      setCommentText('');
      setLocalCommentCount(prev => prev + 1);
    } catch (e) { alert('댓글 전송에 실패했습니다.'); } finally { setIsSendingComment(false); }
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
        
        {/* 1. 헤더 */}
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

        {/* 2. 본문 */}
        <div className="px-7 py-2 pb-4">
          <h3 className="text-[20px] font-bold text-[#1C1C1E] leading-tight break-keep">{topic}</h3>
        </div>

        {/* 3. 투표 버튼 - 인스타그램 세로형 스타일 */}
        <div className="px-6 pb-6 pt-2">
          {!isVotingStatus && (
            <div className="flex items-center justify-center gap-2 py-2 mb-4 bg-gray-50/80 rounded-xl border border-gray-100">
              <span className="text-[12px] text-slate-500 font-bold">
                {debateStatus === 'completed' ? '🔒 투표가 종료되었습니다' : debateStatus === 'arguing' ? '✍️ 주장 작성 중' : '⚖️ AI 판결 진행 중'}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {/* 찬성 버튼 */}
            <button
              onClick={() => handleVote('A')}
              disabled={isVoting || !isVotingStatus}
              className={`relative h-16 w-full rounded-2xl overflow-hidden transition-all active:scale-[0.98] border-2 
                ${myVote === 'A' ? 'border-[#34C759]' : 'border-slate-100'}
                ${!isVotingStatus ? 'opacity-50' : ''}`}
            >
              {/* 투표 후 퍼센트 배경 */}
              {myVote && (
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${agreePercent}%` }} 
                  className="absolute inset-y-0 left-0 bg-[#34C759]/10"
                />
              )}
              
              <div className="relative h-full px-5 flex items-center justify-between z-10">
                <span className={`text-[16px] font-bold ${myVote === 'A' ? 'text-[#34C759]' : 'text-slate-700'}`}>찬성</span>
                {myVote && (
                  <div className="flex flex-col items-end">
                    <span className="text-[16px] font-black text-slate-900">{agreePercent}%</span>
                    <span className="text-[10px] font-bold text-slate-400">{voteCounts.agree.toLocaleString()}표</span>
                  </div>
                )}
              </div>
            </button>

            {/* 반대 버튼 */}
            <button
              onClick={() => handleVote('B')}
              disabled={isVoting || !isVotingStatus}
              className={`relative h-16 w-full rounded-2xl overflow-hidden transition-all active:scale-[0.98] border-2 
                ${myVote === 'B' ? 'border-[#FF3B30]' : 'border-slate-100'}
                ${!isVotingStatus ? 'opacity-50' : ''}`}
            >
              {/* 투표 후 퍼센트 배경 */}
              {myVote && (
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${disagreePercent}%` }} 
                  className="absolute inset-y-0 left-0 bg-[#FF3B30]/10"
                />
              )}
              
              <div className="relative h-full px-5 flex items-center justify-between z-10">
                <span className={`text-[16px] font-bold ${myVote === 'B' ? 'text-[#FF3B30]' : 'text-slate-700'}`}>반대</span>
                {myVote && (
                  <div className="flex flex-col items-end">
                    <span className="text-[16px] font-black text-slate-900">{disagreePercent}%</span>
                    <span className="text-[10px] font-bold text-slate-400">{voteCounts.disagree.toLocaleString()}표</span>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* 4. 하단 액션 바 */}
        <div className="px-6 py-4 flex justify-between items-center border-t border-gray-50 bg-gray-50/30">
          <div className="flex items-center gap-5">
            <button onClick={handleLike} disabled={isLiking} className="flex items-center gap-1.5 active:scale-90 transition-transform">
              <svg fill={liked ? '#FF3B30' : 'none'} stroke={liked ? '#FF3B30' : '#262626'} strokeWidth="2.5" height="19" viewBox="0 0 24 24" width="19">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span className="text-[13px] font-black">{likeCount}</span>
            </button>

            <button onClick={() => setIsCommentOpen(true)} className="flex items-center gap-1.5 active:scale-90 transition-transform">
              <svg fill="none" stroke="#262626" strokeWidth="2.5" height="19" viewBox="0 0 24 24" width="19">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              <span className="text-[13px] font-black">{localCommentCount}</span>
            </button>

            <div className="flex items-center gap-1.5 opacity-40">
              <svg fill="none" stroke="#262626" strokeWidth="2.5" height="19" viewBox="0 0 24 24" width="19">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <span className="text-[13px] font-black">{viewCount}</span>
            </div>
          </div>

          <Link to={`/moragora/${feed.debate_id}`} className="text-[#007AFF] text-[14px] font-black hover:opacity-70 transition-opacity">
            JOIN DEBATE →
          </Link>
        </div>
      </div>

      {/* 댓글 시트 (기존 로직 동일) */}
      <AnimatePresence>
        {isCommentOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCommentOpen(false)} className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-sm" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 bg-white z-[201] rounded-t-[32px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-gray-100 bg-gray-50/50">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[18px] font-black text-black">Comments <span className="text-[#007AFF]">{comments.length}</span></h3>
                  <button onClick={() => setIsCommentOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-200/50 rounded-full text-gray-500 font-bold">×</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                    <p className="text-[14px] font-bold">No comments yet.</p>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-4">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-[14px] font-black text-slate-400">
                        {(c.profiles?.nickname || '익명').charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[14px] font-black text-black">{c.profiles?.nickname || '익명'}</span>
                          <span className="text-[11px] font-bold text-gray-300 uppercase">{formatCommentTime(c.created_at)}</span>
                        </div>
                        <p className="text-[15px] text-slate-700 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-white" style={{ paddingBottom: `max(20px, env(safe-area-inset-bottom))` }}>
                <div className="flex items-center gap-3 bg-gray-100 rounded-2xl p-2 px-4 border border-gray-200/50 focus-within:border-[#007AFF]/30 transition-all">
                  <input
                    ref={commentInputRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                    placeholder={user ? "Write a comment..." : "Login required"}
                    disabled={!user}
                    className="flex-1 bg-transparent py-2 text-[15px] outline-none placeholder-gray-400"
                  />
                  <button onClick={handleSendComment} disabled={!commentText.trim() || isSendingComment || !user} className="w-9 h-9 rounded-xl bg-[#007AFF] flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200 disabled:opacity-30 active:scale-90">
                    {isSendingComment ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg fill="white" height="16" viewBox="0 0 24 24" width="16"><path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/></svg>}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}