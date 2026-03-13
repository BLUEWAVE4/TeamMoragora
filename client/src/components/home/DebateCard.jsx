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

  // 좋아요
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  // 댓글 모달
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(0); // Supabase에서 실제 카운트 로드
  const commentInputRef = useRef(null);

  // 공유 시트
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  // 조회수
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

  // 좋아요 실제 카운트 + 내 좋아요 여부
  useEffect(() => {
    if (!feed?.debate_id) return;
    const fetchLikeData = async () => {
      try {
        const { count } = await supabase
          .from('debate_likes')
          .select('*', { count: 'exact', head: true })
          .eq('debate_id', feed.debate_id);
        setLikeCount(count ?? 0);
        if (user) {
          const { data } = await supabase
            .from('debate_likes')
            .select('id')
            .eq('debate_id', feed.debate_id)
            .eq('user_id', user.id)
            .maybeSingle();
          setLiked(!!data);
        }
      } catch (e) { console.log('좋아요 fetch 실패:', e); }
    };
    fetchLikeData();
  }, [feed?.debate_id, user]);

  // 댓글 카운트 초기 fetch (카드에 표시되는 숫자)
  useEffect(() => {
    if (!feed?.debate_id) return;
    const fetchCommentCount = async () => {
      try {
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('debate_id', feed.debate_id);
        setLocalCommentCount(count ?? 0);
      } catch (e) { console.log('댓글 카운트 fetch 실패:', e); }
    };
    fetchCommentCount();
  }, [feed?.debate_id]);

  // 댓글 모달 열릴 때 댓글 로드
  useEffect(() => {
    if (!isCommentOpen || !feed?.debate_id) return;
    const fetchComments = async () => {
      try {
        const { data } = await supabase
          .from('comments')
          .select('*, profiles(nickname)')
          .eq('debate_id', feed.debate_id)
          .order('created_at', { ascending: true });
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
  const creatorNickname = isMe
    ? (user.user_metadata?.nickname || "나")
    : (debate.creator?.nickname || "익명");
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
          .eq('debate_id', feed.debate_id).eq('user_id', user.id);
      } else {
        await supabase.from('debate_likes')
          .insert({ debate_id: feed.debate_id, user_id: user.id });
      }
    } catch (err) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally { setIsLiking(false); }
  };

  // 댓글 전송 핸들러
  const handleSendComment = async () => {
    if (!user) { alert('로그인이 필요합니다.'); return; }
    if (!commentText.trim() || isSendingComment) return;
    setIsSendingComment(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          debate_id: feed.debate_id,
          user_id: user.id,
          content: commentText.trim(),
        })
        .select('*, profiles(nickname)')
        .single();
      if (error) throw error;
      setComments(prev => [...prev, data]);
      setCommentText('');
      setLocalCommentCount(prev => prev + 1);
    } catch (e) {
      console.error('댓글 전송 실패:', e);
      alert('댓글 전송에 실패했습니다.');
    } finally { setIsSendingComment(false); }
  };

  // 링크 복사
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(debateUrl);
      setCopyDone(true);
      setTimeout(() => { setCopyDone(false); setIsShareOpen(false); }, 1500);
    } catch (e) { alert('복사에 실패했습니다.'); }
  };

  // 카카오톡 공유
  const handleKakaoShare = () => {
    const kakaoUrl = `https://sharer.kakao.com/talk/friends/picker/link?app_key=YOUR_KAKAO_APP_KEY&link=${encodeURIComponent(debateUrl)}`;
    // 카카오 SDK가 있으면 SDK 방식, 없으면 URL 방식
    if (window.Kakao?.Share) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: topic,
          description: '논쟁에 참여해보세요!',
          imageUrl: `${window.location.origin}/og-image.png`,
          link: { mobileWebUrl: debateUrl, webUrl: debateUrl },
        },
        buttons: [{ title: '논쟁 참여하기', link: { mobileWebUrl: debateUrl, webUrl: debateUrl } }],
      });
    } else {
      // SDK 없으면 링크 복사로 대체
      handleCopyLink();
    }
    setIsShareOpen(false);
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
          <h3 className="text-[18px] font-medium text-[#262626] leading-snug break-keep">{topic}</h3>
        </div>

        {/* 3. 투표 버튼 - iOS 스타일 */}
        <div className="px-5 pb-5 pt-1">
          {!isVotingStatus && (
            <div className="flex items-center justify-center gap-2 py-2 mb-2">
              <span className="text-[13px] text-[#8E8E93] font-medium">
                {debateStatus === 'completed' ? '⏱ 투표가 마감되었습니다' : debateStatus === 'arguing' ? '✏️ 주장 작성 중인 논쟁입니다' : '⚖️ 판결 진행 중입니다'}
              </span>
            </div>
          )}
          {/* 세그먼트 컨트롤 배경 */}
          <div className={`relative flex bg-[#F2F2F7] rounded-[14px] p-1 gap-1 ${!isVotingStatus ? 'opacity-40 pointer-events-none' : ''}`}>
            {/* 슬라이딩 인디케이터 */}
            <div
              className="absolute top-1 bottom-1 rounded-[10px] shadow-sm transition-all duration-300 ease-in-out"
              style={{
                width: 'calc(50% - 6px)',
                left: myVote === 'B' ? 'calc(50% + 2px)' : '4px',
                background: myVote === 'A'
                  ? 'linear-gradient(135deg, #34C759, #30D158)'
                  : myVote === 'B'
                  ? 'linear-gradient(135deg, #FF3B30, #FF453A)'
                  : 'white',
                opacity: myVote ? 1 : 0,
              }}
            />
            {/* 찬성 버튼 */}
            <button
              onClick={() => handleVote('A')}
              disabled={isVoting}
              className="relative flex-1 flex items-center justify-center gap-2 py-3 rounded-[10px] transition-all duration-200 active:scale-[0.97] z-10"
            >
              <span className={`text-[15px] font-semibold tracking-tight transition-colors duration-200 ${
                myVote === 'A' ? 'text-white' : myVote === 'B' ? 'text-[#8E8E93]' : 'text-[#1C1C1E]'
              }`}>
                {myVote === 'A' ? '✓ 찬성' : '찬성'}
              </span>
            </button>
            {/* 구분선 (미선택시만 표시) */}
            {!myVote && (
              <div className="absolute left-1/2 top-3 bottom-3 w-px bg-[#C7C7CC] -translate-x-1/2 z-10" />
            )}
            {/* 반대 버튼 */}
            <button
              onClick={() => handleVote('B')}
              disabled={isVoting}
              className="relative flex-1 flex items-center justify-center gap-2 py-3 rounded-[10px] transition-all duration-200 active:scale-[0.97] z-10"
            >
              <span className={`text-[15px] font-semibold tracking-tight transition-colors duration-200 ${
                myVote === 'B' ? 'text-white' : myVote === 'A' ? 'text-[#8E8E93]' : 'text-[#1C1C1E]'
              }`}>
                {myVote === 'B' ? '✓ 반대' : '반대'}
              </span>
            </button>
          </div>
        </div>

        {/* 4. 투표 결과 바 - iOS 스타일 */}
        {myVote !== null && (
          <div className="px-5 pb-4">
            {/* 퍼센트 라벨 */}
            <div className="flex justify-between items-center mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#34C759]" />
                <span className="text-[12px] font-semibold text-[#34C759]">{agreePercent}%</span>
                <span className="text-[11px] text-[#8E8E93]">({voteCounts.agree.toLocaleString()}명)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#8E8E93]">({voteCounts.disagree.toLocaleString()}명)</span>
                <span className="text-[12px] font-semibold text-[#FF3B30]">{disagreePercent}%</span>
                <div className="w-2 h-2 rounded-full bg-[#FF3B30]" />
              </div>
            </div>
            {/* 프로그레스 바 */}
            <div className="w-full h-[6px] rounded-full bg-[#FF3B30]/20 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${agreePercent}%`,
                  background: 'linear-gradient(90deg, #34C759, #30D158)',
                }}
              />
            </div>
            <p className="text-center text-[11px] text-[#8E8E93] mt-2 font-medium">
              총 {totalVotes.toLocaleString()}명 참여 · 재클릭 시 투표 취소
            </p>
          </div>
        )}

        {/* 5. 하단 액션 바 */}
        <div className="px-6 py-4 flex justify-between items-center border-t border-gray-50 mt-2">
          <div className="flex items-center gap-5">

            {/* 좋아요 */}
            <button onClick={handleLike} disabled={isLiking}
              className="flex items-center gap-1.5 active:scale-90 transition-transform">
              <svg fill={liked ? '#FF3B30' : 'none'} stroke={liked ? '#FF3B30' : '#262626'}
                strokeWidth="2" height="20" viewBox="0 0 24 24" width="20"
                style={{ transform: liked ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.15s ease, fill 0.15s ease' }}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span className="text-[13px] font-bold" style={{ color: liked ? '#FF3B30' : '#262626', transition: 'color 0.15s ease' }}>
                {likeCount}
              </span>
            </button>

            {/* 댓글 버튼 → 모달 열기 */}
            <button onClick={() => setIsCommentOpen(true)}
              className="flex items-center gap-1.5 opacity-80 active:scale-90 transition-transform">
              <svg fill="none" stroke="#262626" strokeWidth="2" height="20" viewBox="0 0 24 24" width="20">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              <span className="text-[13px] font-bold text-[#262626]">{isCommentOpen ? comments.length : localCommentCount}</span>
            </button>

            {/* 조회수 */}
            <div className="flex items-center gap-1.5 opacity-50">
              <svg fill="none" stroke="#262626" strokeWidth="2" height="20" viewBox="0 0 24 24" width="20">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span className="text-[13px] font-bold text-[#262626]">{viewCount}</span>
            </div>

            {/* 공유 버튼 */}
            <button onClick={() => setIsShareOpen(true)}
              className="opacity-80 hover:opacity-50 transition-opacity active:scale-90">
              <svg fill="none" stroke="#262626" strokeWidth="2" height="20" viewBox="0 0 24 24" width="20">
                <line x1="22" x2="11" y1="2" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

          <Link to={`/debate/${feed.debate_id}`} className="text-[#0095f6] text-[14px] font-extrabold hover:underline">
            참여하기
          </Link>
        </div>
      </div>

      {/* ── 댓글 바텀시트 ── */}
      <AnimatePresence>
        {isCommentOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCommentOpen(false)}
              className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-white z-[201] rounded-t-[28px] max-h-[75vh] flex flex-col shadow-2xl"
            >
              {/* 핸들 + 헤더 */}
              <div className="flex-shrink-0 px-5 pt-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  <h3 className="text-[16px] font-black text-black">댓글 {comments.length}</h3>
                  <button onClick={() => setIsCommentOpen(false)} className="text-gray-400 text-[13px] font-bold">닫기</button>
                </div>
              </div>

              {/* 댓글 리스트 */}
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                    <svg fill="none" stroke="currentColor" strokeWidth="1.5" height="40" viewBox="0 0 24 24" width="40" className="mb-2">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                    <p className="text-[13px] font-bold">첫 댓글을 남겨보세요!</p>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-[13px] font-black text-gray-400">
                        {(c.profiles?.nickname || '익명').charAt(0)}
                      </div>
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

              {/* 댓글 입력창 */}
              <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 flex items-center gap-3"
                style={{ paddingBottom: `max(12px, env(safe-area-inset-bottom))` }}>
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[12px] font-black text-gray-400 flex-shrink-0">
                  {user ? (user.user_metadata?.nickname || '나').charAt(0) : '?'}
                </div>
                <input
                  ref={commentInputRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                  placeholder={user ? "댓글을 입력하세요..." : "로그인 후 댓글을 남길 수 있어요"}
                  disabled={!user}
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-[14px] outline-none placeholder-gray-400 disabled:opacity-50"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!commentText.trim() || isSendingComment || !user}
                  className="w-8 h-8 rounded-full bg-[#007AFF] flex items-center justify-center flex-shrink-0 disabled:opacity-30 active:scale-90 transition-all"
                >
                  {isSendingComment ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg fill="white" height="14" viewBox="0 0 24 24" width="14">
                      <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/>
                    </svg>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 공유 바텀시트 ── */}
      <AnimatePresence>
        {isShareOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsShareOpen(false)}
              className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-white z-[201] rounded-t-[28px] shadow-2xl"
              style={{ paddingBottom: `max(24px, env(safe-area-inset-bottom))` }}
            >
              <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-4" />
              <div className="px-5 pb-2">
                <h3 className="text-[16px] font-black text-black mb-1">공유하기</h3>
                <p className="text-[12px] text-gray-400 font-medium line-clamp-1">{topic}</p>
              </div>
              <div className="px-5 py-4 flex gap-4">

                {/* 카카오톡 */}
                <button onClick={handleKakaoShare}
                  className="flex flex-col items-center gap-2 active:scale-90 transition-transform">
                  <div className="w-14 h-14 rounded-2xl bg-[#FEE500] flex items-center justify-center shadow-sm">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#3A1D1D">
                      <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.6 5.1 4 6.6l-.8 3 3.3-1.9c1 .3 2 .4 3.1.4 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-gray-600">카카오톡</span>
                </button>

                {/* 링크 복사 */}
                <button onClick={handleCopyLink}
                  className="flex flex-col items-center gap-2 active:scale-90 transition-transform">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-colors ${copyDone ? 'bg-green-500' : 'bg-gray-100'}`}>
                    {copyDone ? (
                      <svg fill="none" stroke="white" strokeWidth="2.5" height="24" viewBox="0 0 24 24" width="24">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <svg fill="none" stroke="#262626" strokeWidth="2" height="24" viewBox="0 0 24 24" width="24">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-gray-600">{copyDone ? '복사됨!' : '링크 복사'}</span>
                </button>

                {/* 기타 (네이티브 공유) */}
                {navigator.share && (
                  <button onClick={async () => {
                    try { await navigator.share({ title: topic, url: debateUrl }); setIsShareOpen(false); } catch (e) {}
                  }} className="flex flex-col items-center gap-2 active:scale-90 transition-transform">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center shadow-sm">
                      <svg fill="none" stroke="#262626" strokeWidth="2" height="24" viewBox="0 0 24 24" width="24">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>
                        <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold text-gray-600">더 보기</span>
                  </button>
                )}
              </div>

              <div className="mx-5 mt-1">
                <button onClick={() => setIsShareOpen(false)}
                  className="w-full py-3.5 bg-gray-100 rounded-2xl text-[15px] font-bold text-gray-600 active:scale-95 transition-all">
                  취소
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}