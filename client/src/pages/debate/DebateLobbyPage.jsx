import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';
import api, { castVote, cancelVote, toggleDebateLike, incrementDebateView, getMyVote } from '../../services/api';
import { motion } from 'framer-motion';
import { resolveAvatar } from '../../utils/avatar';
import { timeAgo } from '../../utils/dateFormatter';
import LoginPromptModal from '../common/LoginPromptModal';
import MoragoraModal from '../common/MoragoraModal';
import CommentBottomSheet from '../common/CommentBottomSheet';
// 에러 해결을 위해 LikeListBottomSheet 임포트 제거
import useThemeStore from '../../store/useThemeStore';
import useModalState from '../../hooks/useModalState';

// 투표 카운트다운 커스텀 훅
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

function DebateCard({ feed }) {
  const { user } = useAuth();
  const isDark = useThemeStore(s => s.isDark);
  const navigate = useNavigate();

  const debateData = feed?.debate || feed || {};
  const debateId = feed?.debate_id || debateData?.id;
  const isVotingStatus = debateData?.status === 'voting';
  const isCompleted = debateData?.status === 'completed';
  const isParticipant = user && (debateData?.creator_id === user.id || debateData?.opponent_id === user.id);

  const timeLeft = useVoteCountdown(debateData?.created_at, debateData?.vote_duration);
  
  const isClosed = !isVotingStatus || timeLeft?.expired || isCompleted;
  const canVote = isVotingStatus && !timeLeft?.expired && !isParticipant;

  const storageKey = `my_vote_${debateId}_${user?.id}`;
  const [myVote, setMyVote] = useState(() => localStorage.getItem(storageKey) || null);
  const [voteCounts, setVoteCounts] = useState({
    agree: feed?.citizen_score_a ?? 0,
    disagree: feed?.citizen_score_b ?? 0,
  });

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(feed?.likes_count ?? 0);
  const [viewCount, setViewCount] = useState(feed?.views_count ?? debateData?.view_count ?? 0);
  const [localCommentCount, setLocalCommentCount] = useState(feed?.comments_count ?? 0);

  const [isVoting, setIsVoting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { modalState, showModal, closeModal } = useModalState();

  useEffect(() => {
    if (!debateId || !user) return;
    getMyVote(debateId).then(res => {
      const serverVote = res?.voted_side || null;
      setMyVote(serverVote);
      if (serverVote) localStorage.setItem(storageKey, serverVote);
      else localStorage.removeItem(storageKey);
    }).catch(() => {});
    api.get(`/debates/${debateId}/like/me`).then(res => setLiked(!!res?.liked)).catch(() => {});
  }, [debateId, user, storageKey]);

  if (!feed) return null;

  const totalVotes = voteCounts.agree + voteCounts.disagree;
  const agreePercent = totalVotes === 0 ? 0 : Math.round((voteCounts.agree / totalVotes) * 100);
  const disagreePercent = totalVotes === 0 ? 0 : 100 - agreePercent;

  const handleVote = async (side) => {
    if (!user) { setShowLoginModal(true); return; }
    if (isVoting || !canVote) return;
    const isCanceling = myVote === side;
    const prevVote = myVote;
    const prevCounts = { ...voteCounts };
    const nextVote = isCanceling ? null : side;
    
    setMyVote(nextVote);
    if (nextVote) localStorage.setItem(storageKey, nextVote);
    else localStorage.removeItem(storageKey);
    
    setVoteCounts(prev => {
      const next = { ...prev };
      const key = side === 'A' ? 'agree' : 'disagree';
      if (isCanceling) next[key] = Math.max(0, next[key] - 1);
      else if (prevVote === null) next[key] += 1;
      else {
        next[prevVote === 'A' ? 'agree' : 'disagree'] = Math.max(0, next[prevVote === 'A' ? 'agree' : 'disagree'] - 1);
        next[key] += 1;
      }
      return next;
    });

    setIsVoting(true);
    try {
      if (isCanceling) await cancelVote(debateId);
      else await castVote(debateId, side);
    } catch (err) {
      setMyVote(prevVote); setVoteCounts(prevCounts);
      showModal('투표 실패', '다시 시도해주세요.');
    } finally { setIsVoting(false); }
  };

  const handleLike = async () => {
    if (!user) { setShowLoginModal(true); return; }
    if (isLiking) return;
    const prevLiked = liked;
    setLiked(!prevLiked);
    setLikeCount(prev => prevLiked ? Math.max(0, prev - 1) : prev + 1);
    setIsLiking(true);
    try { await toggleDebateLike(debateId); } 
    catch (err) { setLiked(prevLiked); setLikeCount(likeCount); } 
    finally { setIsLiking(false); }
  };

  const handleDetailClick = () => {
    if (!debateId) return;
    navigate(`/moragora/${debateId}`, { 
      state: { userVote: myVote, agreeText: debateData?.pro_side, disagreeText: debateData?.con_side } 
    });
  };

  const pointColor = '#7B3F3F'; 
  const iconStroke = isDark ? '#FFFFFF' : '#262626';

  return (
    // [수정] 피드 카드 전체 테두리에 곡률(rounded-2xl)과 약간의 그림자 추가
    <div className={`w-[98%] max-w-lg mx-auto mb-4 border rounded-2xl overflow-hidden shadow-sm ${isDark ? 'bg-black border-gray-800' : 'bg-white border-gray-100'}`}>
      
      {/* 1. Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="p-[1.2px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
            <div className={`p-[1.5px] rounded-full ${isDark ? 'bg-black' : 'bg-white'}`}>
              <img
                src={resolveAvatar(debateData?.creator?.avatar_url, debateData?.creator_id, debateData?.creator?.gender)}
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className={`text-[13.5px] font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {debateData?.creator?.nickname || "익명"}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-bold border border-gray-200">
                {debateData?.creator?.tier || "Bronze"}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 mt-1">{timeAgo(feed.created_at)}</span>
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-full text-[11px] font-bold border" style={{ borderColor: pointColor, color: pointColor }}>
          {debateData?.category || '일상'}
        </div>
      </div>

      {/* 2. Content & 투표 영역 */}
      <div className="px-5 pb-2 mt-2">
        <h3 className={`text-[17px] font-bold mb-4 leading-normal break-keep ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          {debateData?.topic}
        </h3>
        
        <div className={`rounded-xl border p-5 shadow-inner mb-4 bg-gray-50 dark:bg-black/20 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="flex items-center justify-between mb-5 pb-1 border-b border-gray-100 dark:border-gray-800/50">
            {isClosed ? (
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                투표 마감
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: pointColor }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M12 20v-8m0 0V4m0 8h8m-8 0H4"/>
                </svg>
                투표 진행중
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {[
              { id: 'A', text: debateData?.pro_side || "찬성", count: voteCounts.agree, percent: agreePercent },
              { id: 'B', text: debateData?.con_side || "반대", count: voteCounts.disagree, percent: disagreePercent }
            ].map((option) => {
              const isSelected = myVote === option.id;
              const showResult = myVote || isClosed || isParticipant;

              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  disabled={isVoting || isClosed || isParticipant}
                  className={`relative w-full h-14 rounded-xl overflow-hidden transition-all active:scale-[0.98]
                    ${showResult ? 'bg-white' : (isDark ? 'bg-white/5' : 'bg-[#EAEAEA]')}
                    ${(isClosed || isParticipant) ? 'cursor-default' : ''}`}
                >
                  {showResult && (
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${option.percent}%` }} 
                      className="absolute inset-y-0 left-0 opacity-10" 
                      style={{ backgroundColor: pointColor }}
                    />
                  )}
                  <div className="relative px-5 h-full flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                      {/* [수정] 동그라미 테두리를 완전히 없애고 글자 A, B만 깔끔하게 표시 */}
                      <span 
                        className={`text-[16px] font-black italic w-4 text-center ${
                          isSelected ? '' : 'text-gray-400'
                        }`}
                        style={isSelected ? { color: pointColor } : {}}
                      >
                        {option.id}
                      </span>
                      <span className={`text-[15px] ${isSelected ? 'font-bold' : 'font-semibold'} ${isSelected ? '' : (isDark ? 'text-gray-200' : 'text-gray-800')}`} 
                            style={isSelected ? { color: pointColor } : {}}>
                        {option.text}
                      </span>
                    </div>
                    {showResult && (
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-gray-400">
                          {option.count.toLocaleString()}표
                        </span>
                        <span className="text-[16px] font-black italic" style={{ color: isSelected ? pointColor : '#999' }}>
                          {option.percent}%
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/50">
             <span className="text-[11px] text-gray-400 font-medium">
               총 {totalVotes.toLocaleString()}명 {isClosed ? '참여' : '참여중'}
             </span>
          </div>
        </div>
      </div>

      {/* 3. Action Bar */}
      <div className="px-5 py-3.5 flex items-center justify-between border-t border-gray-50 dark:border-gray-800/50">
        <div className="flex items-center gap-6">
          <button onClick={handleLike} className="flex items-center gap-2 active:scale-90 transition-transform">
            {liked ? (
              <svg color="#ed4956" fill="#ed4956" height="23" viewBox="0 0 48 48" width="23"><path d="M34.6 3.1c-4.5 0-7.9 1.8-10.6 5.6-2.7-3.7-6.1-5.5-10.6-5.5C6 3.1 0 9.6 0 17.6c0 10.1 9.1 18.1 22.5 30.4 0.7 0.7 1.5 1.1 2.5 1.1s1.8-0.4 2.5-1.1c13.4-12.3 22.5-20.3 22.5-30.4 0-8-6-14.5-13.4-14.5z"/></svg>
            ) : (
              <svg color={iconStroke} fill="none" stroke="currentColor" strokeWidth="2" height="23" viewBox="0 0 24 24" width="23"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            )}
            <span className={`text-[14px] font-bold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{likeCount}</span>
          </button>

          <button onClick={() => setIsCommentOpen(true)} className="flex items-center gap-2 active:scale-90 transition-transform">
            <svg color={iconStroke} fill="none" stroke="currentColor" strokeWidth="2" height="23" viewBox="0 0 24 24" width="23"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            <span className={`text-[14px] font-bold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{localCommentCount}</span>
          </button>

          <div className="flex items-center gap-2">
            <svg color={iconStroke} fill="none" stroke="currentColor" strokeWidth="2" height="21" viewBox="0 0 24 24" width="21">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            <span className={`text-[14px] font-bold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{viewCount}</span>
          </div>
        </div>

        <button 
          onClick={handleDetailClick}
          className="text-[12px] font-bold text-gray-400 hover:text-gray-600 transition-colors"
        >
          상세보기
        </button>
      </div>

      <CommentBottomSheet isOpen={isCommentOpen} onClose={() => setIsCommentOpen(false)} debateId={debateId} onCountChange={setLocalCommentCount} />
      <LoginPromptModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} redirectTo="/" />
      <MoragoraModal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title} description={modalState.description} type="error" />
    </div>
  );
}

export default React.memo(DebateCard);