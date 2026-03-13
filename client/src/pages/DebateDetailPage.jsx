import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { supabase } from '../services/supabase';
import { castVote, getVoteTally, cancelVote } from '../services/api';

export default function DebateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [debate, setDebate] = useState(null);
  const [loading, setLoading] = useState(true);

  // 투표
  const storageKey = `my_vote_${id}_${user?.id}`;
  const savedVote = localStorage.getItem(storageKey);
  const [myVote, setMyVote] = useState(savedVote || null);
  const [voteCounts, setVoteCounts] = useState({ agree: 0, disagree: 0 });
  const [isVoting, setIsVoting] = useState(false);

  // 댓글
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const commentEndRef = useRef(null);

  // 좋아요
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  // 조회수 증가 (한 세션에 한 번만)
  const viewedKey = `viewed_${id}`;
  useEffect(() => {
    if (!id) return;
    const alreadyViewed = sessionStorage.getItem(viewedKey);
    if (alreadyViewed) return;
    const incrementView = async () => {
      try {
        await supabase.rpc('increment_views', { debate_id: id });
        sessionStorage.setItem(viewedKey, '1');
      } catch (e) {
        // rpc 없으면 직접 update로 대체
        try {
          const { data: current } = await supabase
            .from('debates')
            .select('views_count')
            .eq('id', id)
            .single();
          await supabase
            .from('debates')
            .update({ views_count: (current?.views_count || 0) + 1 })
            .eq('id', id);
          sessionStorage.setItem(viewedKey, '1');
        } catch (e2) { console.log('조회수 증가 실패:', e2); }
      }
    };
    incrementView();
  }, [id]);

  // 기본 데이터 fetch
  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        // debate 정보
        const { data: debateData } = await supabase
          .from('debates')
          .select('*, profiles!debates_creator_id_fkey(nickname)')
          .eq('id', id)
          .single();
        setDebate(debateData);

        // 투표 현황
        try {
          const tally = await getVoteTally(id);
          setVoteCounts({ agree: tally?.A ?? 0, disagree: tally?.B ?? 0 });
        } catch (e) { console.log('투표 현황 에러:', e); }

        // 댓글
        const { data: commentData } = await supabase
          .from('comments')
          .select('*, profiles(nickname)')
          .eq('debate_id', id)
          .order('created_at', { ascending: true });
        setComments(commentData || []);

        // 좋아요 수
        const { count } = await supabase
          .from('debate_likes')
          .select('*', { count: 'exact', head: true })
          .eq('debate_id', id);
        setLikeCount(count ?? 0);

        // 내 좋아요 여부
        if (user) {
          const { data: myLike } = await supabase
            .from('debate_likes')
            .select('id')
            .eq('debate_id', id)
            .eq('user_id', user.id)
            .maybeSingle();
          setLiked(!!myLike);
        }
      } catch (e) {
        console.error('데이터 fetch 실패:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id, user]);

  // 투표 핸들러
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
      if (isCanceling) await cancelVote(id);
      else await castVote(id, side);
    } catch (err) {
      setMyVote(prevVote);
      setVoteCounts(prevCounts);
      alert('투표 처리에 실패했습니다.');
    } finally { setIsVoting(false); }
  };

  // 좋아요 핸들러
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
        await supabase.from('debate_likes').delete()
          .eq('debate_id', id).eq('user_id', user.id);
      } else {
        await supabase.from('debate_likes')
          .insert({ debate_id: id, user_id: user.id });
      }
    } catch (err) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally { setIsLiking(false); }
  };

  // 댓글 전송
  const handleSendComment = async () => {
    if (!user) { alert('로그인이 필요합니다.'); return; }
    if (!commentText.trim() || isSendingComment) return;
    setIsSendingComment(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ debate_id: id, user_id: user.id, content: commentText.trim() })
        .select('*, profiles(nickname)')
        .single();
      if (error) throw error;
      setComments(prev => [...prev, data]);
      setCommentText('');
      setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      alert('댓글 전송에 실패했습니다.');
    } finally { setIsSendingComment(false); }
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return '방금';
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
    return `${d.getMonth() + 1}.${d.getDate()}`;
  };

  const total = voteCounts.agree + voteCounts.disagree;
  const perA = total === 0 ? 50 : ((voteCounts.agree / total) * 100).toFixed(1);
  const perB = total === 0 ? 50 : ((voteCounts.disagree / total) * 100).toFixed(1);
  const hasVoted = myVote !== null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#2D3350] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!debate) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-400">
      <p className="font-bold">논쟁을 찾을 수 없습니다.</p>
      <button onClick={() => navigate(-1)} className="text-[#007AFF] font-bold text-sm">돌아가기</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pb-36 max-w-md mx-auto px-4">

      {/* 상단 헤더 */}
      <div className="flex justify-between items-center py-4">
        <button onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-md text-xl active:scale-90 transition-transform">
          ←
        </button>
        <span className="font-black text-[#2D3350] tracking-tighter">
          {debate.status === 'voting' ? '실시간 판결 중' : '논쟁 상세'}
        </span>
        <div className="w-10" />
      </div>

      {/* 메인 투표 카드 */}
      <div className="bg-[#2D3350] rounded-[3.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="flex justify-center mb-6">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all duration-500 ${hasVoted ? 'bg-[#00C193]' : 'bg-[#FF5C5C] animate-pulse'}`}>
            {hasVoted ? '판결 완료' : 'LIVE DEBATE'}
          </span>
        </div>

        <p className="text-center text-gray-400 text-[11px] mb-2 font-semibold">{debate.category || '일상'}</p>
        <h1 className="text-xl font-black text-center leading-snug mb-10 break-keep">
          "{debate.topic}"
        </h1>

        <div className="flex flex-col gap-5">
          {/* A측 - 찬성 */}
          <button onClick={() => handleVote('A')} disabled={isVoting}
            className={`group relative w-full py-7 rounded-[2rem] border transition-all duration-700 overflow-hidden active:scale-[0.95]
              ${hasVoted
                ? (myVote === 'A' ? 'border-[#00C193]' : 'border-white/5 opacity-40')
                : 'bg-white/5 border-white/10 hover:border-[#00C193]'}`}>
            <div className="flex justify-between px-8 items-center relative z-20">
              <span className="font-bold text-lg">A측 찬성</span>
              <span className={`font-black text-2xl transition-all duration-1000 ${hasVoted ? 'scale-110 opacity-100' : 'opacity-30'}`}>
                {hasVoted ? `${perA}%` : 'VS'}
              </span>
            </div>
            <div className="absolute top-0 left-0 h-full bg-[#00C193] transition-all duration-[1500ms] ease-out opacity-40"
              style={{ width: hasVoted ? `${perA}%` : '0%' }} />
          </button>

          {/* B측 - 반대 */}
          <button onClick={() => handleVote('B')} disabled={isVoting}
            className={`group relative w-full py-7 rounded-[2rem] border transition-all duration-700 overflow-hidden active:scale-[0.95]
              ${hasVoted
                ? (myVote === 'B' ? 'border-[#FF5C5C]' : 'border-white/5 opacity-40')
                : 'bg-white/5 border-white/10 hover:border-[#FF5C5C]'}`}>
            <div className="flex justify-between px-8 items-center relative z-20">
              <span className="font-bold text-lg">B측 반대</span>
              <span className={`font-black text-2xl transition-all duration-1000 ${hasVoted ? 'scale-110 opacity-100' : 'opacity-30'}`}>
                {hasVoted ? `${perB}%` : 'VS'}
              </span>
            </div>
            <div className="absolute top-0 left-0 h-full bg-[#FF5C5C] transition-all duration-[1500ms] ease-out opacity-40"
              style={{ width: hasVoted ? `${perB}%` : '0%' }} />
          </button>
        </div>

        {hasVoted && (
          <p className="text-center text-gray-400 text-[11px] mt-4 font-medium">
            선택한 버튼 재클릭 시 투표 취소
          </p>
        )}

        <p className="text-center text-gray-400 text-[11px] mt-3">
          현재 총 <span className="text-white font-bold">{total.toLocaleString()}</span>명이 판결에 참여했습니다
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {/* 좋아요 */}
        <button onClick={handleLike} disabled={isLiking}
          className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-50 flex flex-col items-center gap-1 active:scale-95 transition-all">
          <svg fill={liked ? '#FF3B30' : 'none'} stroke={liked ? '#FF3B30' : '#999'} strokeWidth="2" height="22" viewBox="0 0 24 24" width="22"
            style={{ transform: liked ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.15s ease' }}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span className="text-[13px] font-black text-[#2D3350]">{likeCount}</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">좋아요</span>
        </button>

        {/* 댓글 수 */}
        <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-50 flex flex-col items-center gap-1">
          <svg fill="none" stroke="#999" strokeWidth="2" height="22" viewBox="0 0 24 24" width="22">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
          <span className="text-[13px] font-black text-[#2D3350]">{comments.length}</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">댓글</span>
        </div>

        {/* 조회수 */}
        <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-50 flex flex-col items-center gap-1">
          <svg fill="none" stroke="#999" strokeWidth="2" height="22" viewBox="0 0 24 24" width="22">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <span className="text-[13px] font-black text-[#2D3350]">{(debate.views_count || 0).toLocaleString()}</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">조회수</span>
        </div>
      </div>

      {/* 댓글 섹션 */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-[16px] font-black text-[#2D3350]">댓글 {comments.length}</h2>
        </div>

        <div className="divide-y divide-gray-50">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <svg fill="none" stroke="currentColor" strokeWidth="1.5" height="36" viewBox="0 0 24 24" width="36" className="mb-2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              <p className="text-[13px] font-bold">첫 댓글을 남겨보세요!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-[13px] font-black text-gray-500">
                  {(c.profiles?.nickname || '익명').charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-bold text-black">{c.profiles?.nickname || '익명'}</span>
                    <span className="text-[11px] text-gray-400">{formatTime(c.created_at)}</span>
                  </div>
                  <p className="text-[14px] text-gray-700 leading-snug">{c.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={commentEndRef} />
        </div>
      </div>

      {/* 댓글 입력창 - 하단 fixed */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3 z-50"
        style={{ paddingBottom: `max(12px, env(safe-area-inset-bottom))` }}>
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[12px] font-black text-gray-500 flex-shrink-0">
          {user ? (user.user_metadata?.nickname || '나').charAt(0) : '?'}
        </div>
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
          placeholder={user ? '댓글을 입력하세요...' : '로그인 후 댓글을 남길 수 있어요'}
          disabled={!user}
          className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-[14px] outline-none placeholder-gray-400 disabled:opacity-50"
        />
        <button onClick={handleSendComment}
          disabled={!commentText.trim() || isSendingComment || !user}
          className="w-9 h-9 rounded-full bg-[#2D3350] flex items-center justify-center flex-shrink-0 disabled:opacity-30 active:scale-90 transition-all">
          {isSendingComment ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg fill="white" height="14" viewBox="0 0 24 24" width="14">
              <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}