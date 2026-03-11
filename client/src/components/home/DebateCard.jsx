import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';
import api from '../../services/api';

export default function DebateCard({ feed, formatTime }) {
  const { user } = useAuth();

  // feed 구조에 따른 안전한 데이터 접근
  const debate = feed?.debate || feed || {};
  const debateId = feed?.debate_id || feed?.id;
  const isVotingStatus = debate.status === 'voting';

  const storageKey = `my_vote_${debateId}_${user?.id}`;
  const savedVote = localStorage.getItem(storageKey);

  const [myVote, setMyVote] = useState(savedVote || null);
  const [voteCounts, setVoteCounts] = useState({
    agree: feed?.citizen_score_a ?? 0,
    disagree: feed?.citizen_score_b ?? 0,
  });
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    if (!debateId || !isVotingStatus) return;
    const fetchVoteCounts = async () => {
      try {
        const res = await api.get(`/votes/${debateId}`);
        setVoteCounts({
          agree: res?.A ?? 0,
          disagree: res?.B ?? 0,
        });
      } catch (err) {
        console.log('투표 현황 에러:', err);
      }
    };
    fetchVoteCounts();
  }, [debateId, isVotingStatus]);

  if (!feed) return null;

  const topic = debate.topic || "제목 없는 논쟁";
  const isMe = user && (debate.creator_id === user.id);
  const creatorNickname = isMe
    ? (user.user_metadata?.nickname || "김준민짱")
    : (debate.creator?.nickname || "논쟁마스터");

  const categoryMap = {
    'WORK': '직장', 'DAILY': '일상', 'SOCIETY': '사회', 'LOVE': '연애', 'ECONOMY': '경제'
  };
  const categoryName = categoryMap[debate.category?.toUpperCase()] || debate.category || '일상';

  const totalVotes = voteCounts.agree + voteCounts.disagree;
  const agreePercent = totalVotes === 0 ? 50 : Math.round((voteCounts.agree / totalVotes) * 100);
  const disagreePercent = 100 - agreePercent;

  const handleVote = async (side) => {
    if (!user) { alert('로그인이 필요합니다.'); return; }
    if (isVoting) return;

    const prevVote = myVote;
    const prevCounts = { ...voteCounts };

    setMyVote(side);
    localStorage.setItem(storageKey, side);
    setVoteCounts(prev => {
      const next = { ...prev };
      if (prevVote === null) {
        next[side === 'A' ? 'agree' : 'disagree'] += 1;
      } else if (prevVote !== side) {
        next[prevVote === 'A' ? 'agree' : 'disagree'] -= 1;
        next[side === 'A' ? 'agree' : 'disagree'] += 1;
      }
      return next;
    });

    setIsVoting(true);
    try {
      await api.post(`/votes/${debateId}`, { voted_side: side });
    } catch (err) {
      setMyVote(prevVote);
      setVoteCounts(prevCounts);
      alert(err?.message || '투표 실패');
    } finally {
      setIsVoting(false);
    }
  };

  const btnStyle = (side) => {
    const isSelected = myVote === side;
    const color = side === 'A' ? 'blue' : 'red';
    return `flex-1 flex flex-col items-center justify-center py-2 rounded-2xl border-2 transition-all active:scale-[0.98] ${
      isSelected ? `border-${color}-500 bg-${color}-50` : `border-${color}-200 bg-${color}-50/20 hover:bg-${color}-50`
    }`;
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-[24px] mb-3 overflow-hidden shadow-sm transition-all hover:shadow-md font-sans">
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
          {feed.created_at ? new Date(feed.created_at).toLocaleDateString() : '2026. 3. 11.'}
        </p>
      </div>

      <div className="px-5 py-2">
        <h3 className="text-[17px] font-normal text-[#262626] leading-relaxed break-keep">{topic}</h3>
      </div>

      <div className="px-6 py-3 flex gap-5">
        <button onClick={() => handleVote('A')} disabled={isVoting} className={btnStyle('A')}>
          <span className="text-[16px] font-black text-blue-900 tracking-tight">{myVote === 'A' ? '✓ 찬성' : '찬성'}</span>
        </button>
        <button onClick={() => handleVote('B')} disabled={isVoting} className={btnStyle('B')}>
          <span className="text-[16px] font-black text-red-900 tracking-tight">{myVote === 'B' ? '✓ 반대' : '반대'}</span>
        </button>
      </div>

      {myVote !== null && (
        <div className="px-6 pb-2">
          <div className="flex justify-between text-[12px] font-bold mb-1">
            <span className="text-blue-600">{agreePercent}% ({voteCounts.agree.toLocaleString()}명)</span>
            <span className="text-red-500">{disagreePercent}% ({voteCounts.disagree.toLocaleString()}명)</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-red-200 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${agreePercent}%` }} />
          </div>
        </div>
      )}

      <div className="px-5 py-3 flex justify-between items-center h-14">
        <div className="flex items-center gap-4">
          <svg aria-label="좋아요" fill="#262626" height="24" viewBox="0 0 24 24" width="24"><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.194 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.325.427.54.832.617 1.03a4.21 4.21 0 0 1 3.675-1.941l.167-.03z" /></svg>
          <svg aria-label="댓글" fill="#262626" height="24" viewBox="0 0 24 24" width="24"><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" /></svg>
        </div>
        <Link to={`/debate/${debateId}`} className="bg-[#0095f6] text-white px-5 py-2 rounded-2xl text-[13px] font-bold">참여하기</Link>
      </div>
    </div>
  );
}