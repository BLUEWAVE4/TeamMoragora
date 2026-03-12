import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';
//import api from '../../services/api'; 변경전 동작확인 되면 삭제 
import { castVote, getVoteTally, cancelVote } from '../../services/api'; //변경후

export default function DebateCard({ feed, formatTime }) {
  const { user } = useAuth();

  // feed 구조: verdict 객체 (id, debate_id, winner_side, ai_score_a, ai_score_b,
  //               citizen_vote_count, debate: { topic, category, creator, status })

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

  // voting 중인 경우에만 실시간 투표 수 불러오기
  useEffect(() => {
    if (!feed?.debate_id || !isVotingStatus) return;
    const fetchVoteCounts = async () => {
      try {
        //const res = await api.get(`/votes/${feed.debate_id}`); 변경전 동작확인되면 삭제
        const res = await getVoteTally(feed.debate_id);
        setVoteCounts({
          agree: res?.A ?? 0,
          disagree: res?.B ?? 0,
        });
      } catch (err) {
        console.log('투표 현황 에러:', err);
      }
    };
    fetchVoteCounts();
  }, [feed?.debate_id, isVotingStatus]);

  if (!feed) return null;

  const debate = feed.debate || {};
  const topic = debate.topic || "제목 없는 논쟁";

  const isMe = user && (debate.creator_id === user.id);
  const creatorNickname = isMe
    ? (user.user_metadata?.nickname || "김준민짱")
    : (debate.creator?.nickname || "논쟁마스터");

  const categoryMap = {
    'WORK': '직장', 'DAILY': '일상', 'SOCIETY': '사회', 'ROMANCE': '연애', 'LOVE': '연애',
    'EDUCATION': '교육', 'TECHNOLOGY': '기술', 'POLITICS': '정치', 'PHILOSOPHY': '철학',
    'CULTURE': '문화', 'ECONOMY': '경제',
  };
  const categoryName = categoryMap[debate.category?.toUpperCase()] || debate.category || '일상';

  const totalVotes = voteCounts.agree + voteCounts.disagree;
  const agreePercent = totalVotes === 0 ? 50 : Math.round((voteCounts.agree / totalVotes) * 100);
  const disagreePercent = 100 - agreePercent;

  const handleVote = async (side) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (isVoting) return;

    const isCanceling = myVote === side; // 이미 선택된 버튼을 다시 누름 -> 취소
    const isFirst = myVote === null;
    const isSwitching = myVote !== null && !isCanceling;

    const prevVote = myVote;
    const prevCounts = { ...voteCounts };

    // 1. 상태 업데이트 (UI 우선 반영 - 낙관적 업데이트)
    const nextVote = isCanceling ? null : side;
    setMyVote(nextVote);

    if (nextVote) {
      localStorage.setItem(storageKey, nextVote);
    } else {
      localStorage.removeItem(storageKey);
    }

    setVoteCounts(prev => {
      const next = { ...prev };
      if (isCanceling) {
        // 투표 취소
        next[side === 'A' ? 'agree' : 'disagree'] -= 1;
      } else if (isFirst) {
        // 신규 투표
        next[side === 'A' ? 'agree' : 'disagree'] += 1;
      } else if (isSwitching) {
        // 투표 변경
        next[prevVote === 'A' ? 'agree' : 'disagree'] -= 1;
        next[side === 'A' ? 'agree' : 'disagree'] += 1;
      }
      return next;
    });

    setIsVoting(true);
    try {
      if (isCanceling) {
        // 서버에 투표 삭제 요청 (API 설계에 맞춰 DELETE 사용)
        //await api.delete(`/votes/${feed.debate_id}`); 변경전 동작확인되면 삭제
        await cancelVote(feed.debate_id); //변경후
      } else {
        // 투표 생성 또는 수정 요청
        // await api.post(`/votes/${feed.debate_id}`, { voted_side: side }); 변경전 동작확인 되면 삭제
        await castVote(feed.debate_id, side);
      }
    } catch (err) {
      console.error('투표 통신 실패:', err);
      // 에러 발생 시 상태 롤백
      setMyVote(prevVote);
      if (prevVote) localStorage.setItem(storageKey, prevVote);
      else localStorage.removeItem(storageKey);
      setVoteCounts(prevCounts);
      
      const errorMsg = err?.response?.data?.message || '투표 처리에 실패했습니다.';
      alert(errorMsg);
    } finally {
      setIsVoting(false);
    }
  };

  const btnStyle = (side) => {
    const isSelected = myVote === side;
    if (side === 'A') {
      return isSelected
        ? 'flex-1 flex flex-col items-center justify-center py-2 rounded-2xl border-2 border-blue-500 bg-blue-50 transition-all active:scale-[0.98]'
        : 'flex-1 flex flex-col items-center justify-center py-2 rounded-2xl border-2 border-blue-200 bg-blue-50/20 hover:bg-blue-50 hover:border-blue-100 transition-all active:scale-[0.98]';
    } else {
      return isSelected
        ? 'flex-1 flex flex-col items-center justify-center py-2 rounded-2xl border-2 border-red-500 bg-red-50 transition-all active:scale-[0.98]'
        : 'flex-1 flex flex-col items-center justify-center py-2 rounded-2xl border-2 border-red-200 bg-red-50/20 hover:bg-red-50 hover:border-red-100 transition-all active:scale-[0.98]';
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-[24px] mb-3 overflow-hidden shadow-sm transition-all hover:shadow-md font-sans">

      {/* 1. 헤더 */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-white p-[2px]">
              <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-lg shadow-inner font-black text-gray-400 uppercase">
                {creatorNickname.charAt(0)}
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-bold text-[#262626]">{creatorNickname}</span>
              {isMe && <span className="text-[9px] bg-[#2D3350] px-1.5 py-0.5 rounded-full text-white font-black">나</span>}
            </div>
            <span className="text-[12px] text-gray-500 font-medium">{categoryName}</span>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 font-semibold tracking-tighter">
          {formatTime ? formatTime(feed.created_at) : '2026. 3. 5.'}
        </p>
      </div>

      {/* 2. 본문 */}
      <div className="px-5 py-2">
        <h3 className="text-[17px] font-normal text-[#262626] leading-relaxed break-keep">
          {topic}
        </h3>
      </div>

      {/* 3. 투표 버튼 */}
      <div className="px-6 py-3 flex gap-5">
        <button
          onClick={() => handleVote('A')}
          disabled={isVoting}
          className={btnStyle('A')}
        >
          <span className="text-[16px] font-black text-blue-900 tracking-tight">
            {myVote === 'A' ? '✓ 찬성' : '찬성'}
          </span>
        </button>

        <button
          onClick={() => handleVote('B')}
          disabled={isVoting}
          className={btnStyle('B')}
        >
          <span className="text-[16px] font-black text-red-900 tracking-tight">
            {myVote === 'B' ? '✓ 반대' : '반대'}
          </span>
        </button>
      </div>

      {/* 4. 투표 결과 바 */}
      {myVote !== null && (
        <div className="px-6 pb-2">
          <div className="flex justify-between text-[12px] font-bold mb-1">
            <span className="text-blue-600">{agreePercent}% ({voteCounts.agree.toLocaleString()}명)</span>
            <span className="text-red-500">{disagreePercent}% ({voteCounts.disagree.toLocaleString()}명)</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-red-200 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${agreePercent}%` }}
            />
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-1.5">
            총 {totalVotes.toLocaleString()}명 참여 · 선택한 버튼 재클릭 시 투표 취소
          </p>
        </div>
      )}

      {/* 5. 하단 액션 바 */}
      <div className="px-5 py-3 flex justify-between items-center h-14">
        <div className="flex items-center gap-4">
          <button className="hover:opacity-50 transition-opacity">
            <svg aria-label="좋아요" fill="#262626" height="24" viewBox="0 0 24 24" width="24"><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.194 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.325.427.54.832.617 1.03a4.21 4.21 0 0 1 3.675-1.941l.167-.03z" /></svg>
          </button>
          <button className="hover:opacity-50 transition-opacity">
            <svg aria-label="댓글" fill="#262626" height="24" viewBox="0 0 24 24" width="24"><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" /></svg>
          </button>
          <button className="hover:opacity-50 transition-opacity">
            <svg aria-label="조회" fill="none" stroke="#262626" strokeWidth="2" height="24" viewBox="0 0 24 24" width="24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
          <button className="hover:opacity-50 transition-opacity">
            <svg aria-label="공유" fill="#262626" height="24" viewBox="0 0 24 24" width="24"><line fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" x1="22" x2="9.218" y1="3" y2="10.083" /><polygon fill="none" points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" /></svg>
          </button>
        </div>
        <Link
          to={`/debate/${feed.debate_id}`}
          className="bg-[#0095f6] text-white px-5 py-2 rounded-2xl text-[13px] font-bold hover:bg-blue-600 transition-all shadow-sm active:scale-95"
        >
          참여하기
        </Link>
      </div>

      {/* 6. 좋아요 개수 */}
      <div className="px-5 pb-5 pt-1">
        <p className="text-[13px] font-bold text-[#262626] leading-none">
          좋아요 {debate.likes_count?.toLocaleString() || '530'}개
        </p>
      </div>
    </div>
  );
}