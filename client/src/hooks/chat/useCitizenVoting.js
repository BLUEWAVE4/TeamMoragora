import { useState, useEffect, useCallback } from 'react';
import { socket } from '../../services/socket';
import { castCitizenVote, getCitizenVoteTally } from '../../services/api';

/**
 * 시민 투표 훅 (관전자 전용)
 */
export default function useCitizenVoting(debateId, gameStarted) {
  const [citizenVote, setCitizenVote] = useState(null);
  const [citizenVoteLoading, setCitizenVoteLoading] = useState(false);
  const [voteTally, setVoteTally] = useState({ A: 0, B: 0, total: 0 });

  // 초기 투표 집계 로드
  useEffect(() => {
    if (!gameStarted || !debateId) return;
    getCitizenVoteTally(debateId).then(res => {
      const d = res.data || res;
      setVoteTally({ A: d.A, B: d.B, total: d.total });
      if (d.myVote) setCitizenVote(d.myVote);
    }).catch(() => {});
  }, [gameStarted, debateId]);

  // 소켓으로 실시간 집계 수신
  useEffect(() => {
    if (!debateId) return;
    const handler = (tally) => {
      if (tally) setVoteTally({ A: tally.A, B: tally.B, total: tally.total });
    };
    socket.on('citizen-vote-tally', handler);
    return () => socket.off('citizen-vote-tally', handler);
  }, [debateId]);

  const handleCitizenVote = useCallback(async (side) => {
    if (citizenVoteLoading) return;
    setCitizenVoteLoading(true);
    try {
      await castCitizenVote(debateId, side);
      setCitizenVote(side);
      const res = await getCitizenVoteTally(debateId);
      const d = res.data || res;
      const tally = { A: d.A, B: d.B, total: d.total };
      setVoteTally(tally);
      socket.emit('citizen-vote-update', { debateId, tally });
    } catch (e) { console.error(e); }
    finally { setCitizenVoteLoading(false); }
  }, [debateId, citizenVoteLoading]);

  return {
    citizenVote,
    citizenVoteLoading,
    voteTally,
    setVoteTally,
    handleCitizenVote,
  };
}
