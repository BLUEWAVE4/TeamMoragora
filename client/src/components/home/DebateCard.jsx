import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';
import { castVote, getVoteTally, cancelVote } from '../../services/api';
import { supabase } from '../../services/supabase';

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

  // 좋아요 상태
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(feed?.debate?.likes_count || 0);
  const [isLiking, setIsLiking] = useState(false);

  // 댓글/조회수
  const commentCount = feed?.comments_count || 0;
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

  // 투표 현황 fetch
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

  // 내 좋아요 여부 초기 로드 (debate_likes 테이블)
  useEffect(() => {
    if (!user || !feed?.debate_id) return;
    const checkLiked = async () => {
      try {
        const { data } = await supabase
          .from('debate_likes')
          .select('id')
          .eq('debate_id', feed.debate_id)
          .eq('user_id', user.id)
          .maybeSingle();
        setLiked(!!data);
      } catch (e) {
        console.log('좋아요 상태 확인 실패:', e);
      }
    };
    checkLiked();
  }, [user, feed?.debate_id]);

  if (!feed) return null;

  const debate = feed.debate || {};
  const topic = debate.topic || "제목 없는 논쟁";
  const isMe = user && (debate.creator_id === user.id);
  const creatorNickname = isMe
    ? (user.user_metadata?.nickname || "나")
    : (debate.creator?.nickname || "익명");

  // 카테고리 매핑 (영문 → 한글 + 한글 pass-through)
  const categoryMap = {
    'WORK': '직장', 'DAILY': '일상', 'SOCIETY': '사회', 'ROMANCE': '연애', 'LOVE': '연애',
    'EDUCATION': '교육', 'TECHNOLOGY': '기술', 'POLITICS': '정치', 'PHILOSOPHY': '철학',
    'CULTURE': '문화', 'ECONOMY': '경제',
  };
  const categoryName = categoryMap[debate.category?.toUpperCase()] || debate.category || '일상';
  const categoryIcon = categoryIconMap[categoryName] || categoryIconMap['기타'];

  const totalVotes = voteCounts.agree + voteCounts.disagree;
  const agreePercent = totalVotes === 0 ? 50 : Math.round((voteCounts.agree / totalVotes) * 100);
  const disagreePercent = 100 - agreePercent;

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
      if (isCanceling) await cancelVote(feed.debate_id);
      else await castVote(feed.debate_id, side);
    } catch (err) {
      setMyVote(prevVote);
      setVoteCounts(prevCounts);
      alert('투표 처리에 실패했습니다.');
    } finally { setIsVoting(false); }
  };

  // 좋아요 토글 핸들러
  const handleLike = async () => {
    if (!user) { alert('로그인이 필요합니다.'); return; }
    if (isLiking) return;

    const prevLiked = liked;
    const prevCount = likeCount;

    // 낙관적 업데이트
    setLiked(!prevLiked);
    setLikeCount(prev => prevLiked ? Math.max(0, prev - 1) : prev + 1);
    setIsLiking(true);

    try {
      if (prevLiked) {
        // 좋아요 취소: debate_likes에서 삭제 + likes_count 감소
        await Promise.all([
          supabase
            .from('debate_likes')
            .delete()
            .eq('debate_id', feed.debate_id)
            .eq('user_id', user.id),
          supabase
            .from('debates')
            .update({ likes_count: Math.max(0, prevCount - 1) })
            .eq('id', feed.debate_id),
        ]);
      } else {
        // 좋아요 추가: debate_likes에 insert + likes_count 증가
        await Promise.all([
          supabase
            .from('debate_likes')
            .insert({ debate_id: feed.debate_id, user_id: user.id }),
          supabase
            .from('debates')
            .update({ likes_count: prevCount + 1 })
            .eq('id', feed.debate_id),
        ]);
      }
    } catch (err) {
      // 실패 시 롤백
      setLiked(prevLiked);
      setLikeCount(prevCount);
      console.error('좋아요 처리 실패:', err);
    } finally {
      setIsLiking(false);
    }
  };

  // 공유 핸들러
  const handleShare = async () => {
    const url = `${window.location.origin}/debate/${feed.debate_id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: topic, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('링크가 복사되었습니다!');
      }
    } catch (e) {
      // 사용자가 공유 취소한 경우 무시
    }
  };

  return (
    <div className="w-full bg-white border border-gray-100 rounded-[28px] mb-4 overflow-hidden shadow-sm font-sans">

      {/* 1. 헤더 */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 shadow-inner">
            {categoryIcon}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-bold text-[#1a1a1a]">{creatorNickname}</span>
              {isMe && <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded-full text-white font-bold">나</span>}
            </div>
            <span className="text-[12px] text-gray-400 font-semibold">{categoryName}</span>
          </div>
        </div>
        <p className="text-[11px] text-gray-300 font-bold tracking-wider uppercase">
          {formatTime ? formatTime(feed.created_at) : '방금 전'}
        </p>
      </div>

      {/* 2. 본문 */}
      <div className="px-7 py-2">
        <h3 className="text-[18px] font-medium text-[#262626] leading-snug break-keep">
          {topic}
        </h3>
      </div>

      {/* 3. 투표 버튼 */}
      {isVotingStatus ? (
        <div className="px-6 py-5 flex gap-4">
          <button
            onClick={() => handleVote('A')}
            disabled={isVoting}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-2xl border-2 transition-all active:scale-[0.98] ${myVote === 'A' ? 'border-blue-500 bg-blue-50' : 'border-blue-100 bg-blue-50/20'}`}
          >
            <span className="text-[16px] font-black text-blue-900">{myVote === 'A' ? '✓ 찬성' : '찬성'}</span>
          </button>
          <button
            onClick={() => handleVote('B')}
            disabled={isVoting}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-2xl border-2 transition-all active:scale-[0.98] ${myVote === 'B' ? 'border-red-500 bg-red-50' : 'border-red-100 bg-red-50/20'}`}
          >
            <span className="text-[16px] font-black text-red-900">{myVote === 'B' ? '✓ 반대' : '반대'}</span>
          </button>
        </div>
      ) : (
        <div className="px-6 py-3 text-center">
          <span className="text-[13px] text-gray-400 font-semibold">
            {debateStatus === 'completed' ? '투표가 마감되었습니다' : debateStatus === 'arguing' ? '주장 작성 중' : '판결 진행 중'}
          </span>
        </div>
      )}

      {/* 4. 투표 결과 바 */}
      {myVote !== null && (
        <div className="px-7 pb-4">
          <div className="flex justify-between text-[11px] font-black mb-1.5">
            <span className="text-blue-500">{agreePercent}% ({voteCounts.agree.toLocaleString()}명)</span>
            <span className="text-red-400">{disagreePercent}% ({voteCounts.disagree.toLocaleString()}명)</span>
          </div>
          <div className="w-full h-2 rounded-full bg-red-100 overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-700 ease-out" style={{ width: `${agreePercent}%` }} />
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-2.5 font-medium">
            총 {totalVotes.toLocaleString()}명 참여 · 선택한 버튼 재클릭 시 투표 취소
          </p>
        </div>
      )}

      {/* 5. 하단 액션 바 */}
      <div className="px-6 py-4 flex justify-between items-center border-t border-gray-50 mt-2">
        <div className="flex items-center gap-5">

          {/* 좋아요 버튼 */}
          <button
            onClick={handleLike}
            disabled={isLiking}
            className="flex items-center gap-1.5 active:scale-90 transition-transform"
          >
            <svg
              fill={liked ? '#FF3B30' : 'none'}
              stroke={liked ? '#FF3B30' : '#262626'}
              strokeWidth="2" height="20" viewBox="0 0 24 24" width="20"
              style={{
                transform: liked ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.15s ease, fill 0.15s ease, stroke 0.15s ease'
              }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span
              className="text-[13px] font-bold"
              style={{ color: liked ? '#FF3B30' : '#262626', transition: 'color 0.15s ease' }}
            >
              {likeCount}
            </span>
          </button>

          {/* 댓글 버튼 → debate 상세 페이지로 이동 */}
          <Link
            to={`/debate/${feed.debate_id}`}
            className="flex items-center gap-1.5 opacity-80 active:scale-90 transition-transform"
          >
            <svg fill="none" stroke="#262626" strokeWidth="2" height="20" viewBox="0 0 24 24" width="20">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            <span className="text-[13px] font-bold text-[#262626]">{commentCount}</span>
          </Link>

          {/* 조회수 (표시만) */}
          <div className="flex items-center gap-1.5 opacity-50">
            <svg fill="none" stroke="#262626" strokeWidth="2" height="20" viewBox="0 0 24 24" width="20">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span className="text-[13px] font-bold text-[#262626]">{viewCount}</span>
          </div>

          {/* 공유 버튼 */}
          <button
            onClick={handleShare}
            className="opacity-80 hover:opacity-50 transition-opacity active:scale-90"
          >
            <svg fill="none" stroke="#262626" strokeWidth="2" height="20" viewBox="0 0 24 24" width="20">
              <line x1="22" x2="11" y1="2" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <Link
          to={`/moragora/${feed.debate_id}`}
          className="text-[#0095f6] text-[14px] font-extrabold hover:underline"
        >
          참여하기
        </Link>
      </div>
    </div>
  );
}
