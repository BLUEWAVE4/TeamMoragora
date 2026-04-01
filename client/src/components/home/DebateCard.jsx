import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';
import api, { castVote, cancelVote, toggleDebateLike, incrementDebateView, getMyVote } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveAvatar } from '../../utils/avatar';
import { timeAgo } from '../../utils/dateFormatter';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

const SOCRATES_AVATAR = createAvatar(avataaars, {
  top: ['sides'], hairColor: ['e8e1e1'], skinColor: ['ffdbb4'],
  facialHair: ['beardMajestic'], facialHairColor: ['e8e1e1'], facialHairProbability: 100,
  eyes: ['default'], eyebrows: ['unibrowNatural'],
  clothing: ['shirtVNeck'], clothesColor: ['929598'], accessoriesProbability: 0,
  mouth: ['serious'],
}).toDataUri();
import LoginPromptModal from '../common/LoginPromptModal';
import MoragoraModal from '../common/MoragoraModal';
import CommentBottomSheet from '../common/CommentBottomSheet';
import useThemeStore from '../../store/useThemeStore';
import useModalState from '../../hooks/useModalState';

const TIER_COLORS = {
  '시민': '#8E8E93',
  '배심원': '#007AFF',
  '변호사': '#AF52DE',
  '판사': '#FF9500',
  '대법관': '#FF3B30',
};

function useVoteCountdown(createdAt, voteDuration, voteDeadline) {
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (!createdAt || !voteDuration) return;
    const totalMs = Number(voteDuration) * 24 * 60 * 60 * 1000;
    // vote_deadline이 있으면 그걸 사용, 없으면 created_at + duration fallback
    const deadline = voteDeadline ? new Date(voteDeadline) : new Date(new Date(createdAt).getTime() + totalMs);
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
  }, [createdAt, voteDuration, voteDeadline]);
  return timeLeft;
}

function DebateCard({ feed, initialVote, initialLiked }) {
  const { user } = useAuth();
  const isDark = useThemeStore(s => s.isDark);
  const navigate = useNavigate();

  const debateData = feed?.debate || feed || {};
  const debateStatus = debateData?.status;
  const isVotingStatus = debateStatus === 'voting';

  const voteDuration = debateData?.vote_duration ?? null;
  const timeLeft = useVoteCountdown(debateData?.created_at, voteDuration, debateData?.vote_deadline);
  const hasTimer = !!voteDuration;
  const timerExpired = timeLeft?.expired === true;
  // 타이머가 있고 아직 안 만료되면 투표 가능 (status와 무관)
  const isVoteOpen = hasTimer && !timerExpired;
  const isCompleted = debateStatus === 'completed' && !isVoteOpen;
  const canVote = (isVotingStatus || isVoteOpen) && !timerExpired;

  const barColor = !timeLeft || timeLeft.progressRatio > 0.5 ? '#10b981'
    : timeLeft.progressRatio > 0.2 ? '#f59e0b' : '#ef4444';

  const optionAText = debateData?.pro_side || feed?.pro_side || "";
  const optionBText = debateData?.con_side || feed?.con_side || "";

  const [myVote, setMyVote] = useState(initialVote || null);

  // 배치 데이터 없으면 개별 조회 폴백
  useEffect(() => {
    if (initialVote !== undefined) return;
    const debateId = feed?.debate_id || debateData?.id;
    if (!debateId || !user) return;
    getMyVote(debateId).then(res => {
      setMyVote(res?.voted_side || null);
    }).catch(() => {});
  }, [feed?.debate_id, debateData?.id, user, initialVote]);
  // citizen_score_a/b는 퍼센트(0~100)이므로 citizen_vote_count로 실제 투표 수 역산
  const citizenTotal = feed?.citizen_vote_count ?? 0;
  const scoreSum = (feed?.citizen_score_a || 0) + (feed?.citizen_score_b || 0) || 1;
  const [voteCounts, setVoteCounts] = useState({
    agree: citizenTotal > 0 ? Math.round(citizenTotal * (feed?.citizen_score_a || 0) / scoreSum) : 0,
    disagree: citizenTotal > 0 ? citizenTotal - Math.round(citizenTotal * (feed?.citizen_score_a || 0) / scoreSum) : 0,
  });
  const [isVoting, setIsVoting] = useState(false);

  const [liked, setLiked] = useState(initialLiked || false);
  // 서버에서 내려준 좋아요 수 사용
  const [likeCount, setLikeCount] = useState(feed?.likes_count ?? 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { modalState, showModal, closeModal } = useModalState();
  const [localCommentCount, setLocalCommentCount] = useState(feed?.comments_count ?? 0);
  const [viewCount, setViewCount] = useState(feed?.views_count ?? debateData?.view_count ?? 0);

  const categoryIconMap = {
    '사회': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    '기술': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    '철학': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>,
    '연애': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    '일상': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    '정치': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2D3350" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
    '기타': <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  };

  // 배치 데이터 없으면 개별 조회 폴백
  useEffect(() => {
    if (initialLiked !== undefined) return;
    const debateId = feed?.debate_id || debateData?.id;
    if (!debateId || !user) return;
    api.get(`/debates/${debateId}/like/me`).then(res => setLiked(!!res?.liked)).catch(() => {});
  }, [feed?.debate_id, debateData?.id, user, initialLiked]);


  if (!feed) return null;

  const topic = debateData?.topic || "제목 없는 논쟁";
  const isMe = user && (debateData?.creator_id === user.id);
  const isParticipant = user && (debateData?.creator_id === user.id || debateData?.opponent_id === user.id);
  const creatorNickname = debateData?.creator?.nickname || (isMe ? (user.user_metadata?.nickname || "나") : "익명");

  const purposeMap = { 'compete': '경쟁', 'fun': '재미', 'resolve': '해결', 'learn': '학습' };
  const lensMap = { 'general': '종합', 'logic': '논리', 'emotion': '감정', 'practical': '실용', 'ethics': '윤리', 'creative': '자유' };
  const purpose = purposeMap[debateData?.purpose] || debateData?.purpose || '';
  const lens = lensMap[debateData?.lens] || debateData?.lens || '';

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
    if (!user) { setShowLoginModal(true); return; }
    if (isVoting || !canVote || isParticipant) return;
    const isCanceling = myVote === side;
    const prevVote = myVote;
    const prevCounts = { ...voteCounts };
    const nextVote = isCanceling ? null : side;
    setMyVote(nextVote);
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
      showModal('투표 처리에 실패했습니다', '잠시 후 다시 시도해주세요.');
    } finally { setIsVoting(false); }
  };

  const handleLike = async () => {
    const debateId = feed?.debate_id || debateData?.id;
    if (!user) { setShowLoginModal(true); return; }
    if (isLiking) return;
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prev => prevLiked ? Math.max(0, prev - 1) : prev + 1);
    setIsLiking(true);
    try {
      await toggleDebateLike(debateId);
    } catch (err) { setLiked(prevLiked); setLikeCount(prevCount); } finally { setIsLiking(false); }
  };

  const handleDetailClick = () => {
    const debateId = feed?.debate_id || debateData?.id;
    if (!debateId) return;
    const viewKey = `viewed_${debateId}`;
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, 'true');
      setViewCount(prev => prev + 1);
      incrementDebateView(debateId).catch(() => sessionStorage.removeItem(viewKey));
    }
    navigate(`/moragora/${debateId}`, {
      state: { userVote: myVote, agreeText: optionAText, disagreeText: optionBText }
    });
  };

  return (
    <>
      <div className="w-full font-sans pb-5 mb-1 bg-white/70 rounded-xl">

        {/* VS 헤더 (중앙 정렬 + 좌측 카테고리) */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3 relative">
          <div className="flex items-center justify-center gap-3 w-full">
          {/* A측 아바타 + 닉네임 */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-9 h-9 rounded-full overflow-hidden bg-[#1B2A4A]/5 flex-shrink-0 ${debateData?.creator?.tier && debateData.creator.tier !== '시민' ? 'border-2' : ''}`}
              style={debateData?.creator?.tier && debateData.creator.tier !== '시민' ? { borderColor: TIER_COLORS[debateData.creator.tier] } : {}}
            >
              <img src={resolveAvatar(debateData?.creator?.avatar_url, debateData?.creator_id, debateData?.creator?.gender)} alt="" className="w-full h-full object-cover" />
            </div>
            <span className="text-[12px] font-bold text-[#1B2A4A] truncate max-w-[80px]">{creatorNickname}</span>
          </div>

          <span className="text-[11px] font-black text-[#1B2A4A]/30">VS</span>

          {/* B측 아바타 + 닉네임 */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-[#1B2A4A] truncate max-w-[80px]">
              {debateData?.mode === 'solo' ? '소크라테스 AI' : (debateData?.opponent?.nickname || (debateData?.opponent_id ? '익명' : '대기 중'))}
            </span>
            <div
              className={`w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ${debateData?.mode === 'solo' ? 'border-2 ring-2 ring-[#D4AF37]/20' : (debateData?.opponent?.tier && debateData.opponent.tier !== '시민' ? 'border-2' : '')} bg-[#1B2A4A]/5`}
              style={debateData?.mode === 'solo'
                ? { borderColor: '#D4AF37', background: '#1B2A4A' }
                : (debateData?.opponent?.tier && debateData.opponent.tier !== '시민' ? { borderColor: TIER_COLORS[debateData.opponent.tier] } : {})}
            >
              <img
                src={debateData?.mode === 'solo' ? SOCRATES_AVATAR : resolveAvatar(debateData?.opponent?.avatar_url, debateData?.opponent_id, debateData?.opponent?.gender)}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          </div>
        </div>

        <div className="mx-4 border-b border-[#1B2A4A]/5" />

        {/* 주제 (가운데 정렬) */}
        <div className="px-4 pt-3 pb-1">
          <h3 className="text-[19px] font-sans font-black text-[#1B2A4A] leading-[1.45] break-keep tracking-tight text-center">"{topic}"</h3>
        </div>


        {/* 투표 섹션 */}
        <div className="pl-[26px] pr-4 pb-4 pt-1">
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
              {(myVote || isCompleted || isParticipant) && totalVotes > 0 && (
                <motion.div initial={{ width: 0 }} animate={{ width: `${agreePercent}%` }} className="absolute inset-y-0 left-0 bg-emerald-500/8" />
              )}
              <div className="relative h-full px-3.5 flex items-center justify-between z-10">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                    isCompleted || timerExpired ? 'bg-[#1B2A4A]/10 text-[#1B2A4A]/45' :
                    myVote === 'A' ? 'bg-emerald-500 text-white' : 'bg-[#1B2A4A]/8 text-[#1B2A4A]/50'
                  }`}>{isCompleted || timerExpired ? '마감' : 'A측'}</span>
                  <span className={`text-[13px] font-bold truncate ${myVote === 'A' ? 'text-emerald-600' : 'text-[#1B2A4A]/70'}`}>{optionAText || "찬성"}</span>
                </div>
                {(myVote || isCompleted || isParticipant) && (
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
              {(myVote || isCompleted || isParticipant) && totalVotes > 0 && (
                <motion.div initial={{ width: 0 }} animate={{ width: `${disagreePercent}%` }} className="absolute inset-y-0 left-0 bg-red-500/8" />
              )}
              <div className="relative h-full px-3.5 flex items-center justify-between z-10">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                    isCompleted || timerExpired ? 'bg-[#1B2A4A]/10 text-[#1B2A4A]/45' :
                    myVote === 'B' ? 'bg-red-500 text-white' : 'bg-[#1B2A4A]/8 text-[#1B2A4A]/50'
                  }`}>{isCompleted || timerExpired ? '마감' : 'B측'}</span>
                  <span className={`text-[13px] font-bold truncate ${myVote === 'B' ? 'text-red-500' : 'text-[#1B2A4A]/70'}`}>{optionBText || "반대"}</span>
                </div>
                {(myVote || isCompleted || isParticipant) && (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#1B2A4A]/80">{disagreePercent}%</span>
                    <span className="text-[9px] text-[#1B2A4A]/45">{voteCounts.disagree}표</span>
                  </div>
                )}
              </div>
            </button>
          </div>
          {/* 투표 진행 바: [상태 텍스트][게이지바][숫자 타이머] */}
          {hasTimer && (
            <div className="pt-2 flex items-center gap-2">
              <span className="text-[9px] font-bold text-[#1B2A4A]/30 tracking-wider flex-shrink-0 whitespace-nowrap">
                {timerExpired ? '투표 마감' : '투표 진행 중'}
              </span>
              <div className="flex-1 h-1 bg-[#1B2A4A]/8 rounded-full overflow-hidden">
                {timerExpired ? (
                  <div className="h-full w-full bg-[#1B2A4A]/10 rounded-full" />
                ) : (
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(timeLeft?.progressRatio ?? 1) * 100}%`,
                      backgroundColor: barColor,
                    }}
                  />
                )}
              </div>
              <span
                className="text-[9px] font-bold flex-shrink-0 tabular-nums"
                style={{ color: timerExpired ? 'rgba(27,42,74,0.3)' : barColor }}
              >
                {(timeLeft?.label ?? '00:00:00').slice(0, 5)}
              </span>
            </div>
          )}
        </div>

        {/* 하단 액션 바 */}
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-5">
            {(() => {
              const iconStroke = isDark ? '#a0a0a0' : '#1B2A4A';
              return (<>
                <button onClick={handleLike} disabled={isLiking} className="flex items-center gap-1.5 active:scale-90 transition-transform">
                  <svg fill={liked ? '#E63946' : 'none'} stroke={liked ? '#E63946' : iconStroke} strokeWidth="2" height="18" viewBox="0 0 24 24" width="18" opacity={liked ? 1 : 0.7}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  <span className="text-[12px] font-bold text-[#1B2A4A]/60">{likeCount}</span>
                </button>
                <button onClick={() => setIsCommentOpen(true)} className="flex items-center gap-1.5 active:scale-90 transition-transform">
                  <svg fill="none" stroke={iconStroke} strokeWidth="2" height="18" viewBox="0 0 24 24" width="18" opacity="0.7"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  <span className="text-[12px] font-bold text-[#1B2A4A]/60">{localCommentCount}</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <svg fill="none" stroke={iconStroke} strokeWidth="2" height="18" viewBox="0 0 24 24" width="18" opacity="0.6">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span className="text-[12px] font-bold text-[#1B2A4A]/50">{viewCount}</span>
                </div>
              </>);
            })()}
          </div>
          <button onClick={handleDetailClick} className="text-[12px] font-bold text-[#1B2A4A] active:scale-95 transition-all">
            상세보기
          </button>
        </div>
      </div>

      <CommentBottomSheet
        isOpen={isCommentOpen}
        onClose={() => setIsCommentOpen(false)}
        debateId={feed?.debate_id || debateData?.id}
        onCountChange={setLocalCommentCount}
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
}

export default React.memo(DebateCard);