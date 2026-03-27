import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { socket } from '../../services/socket';
import { debounce } from '../../utils/perf';

/**
 * 타이핑 인디케이터 훅
 * - 상대방 타이핑 상태 수신
 * - 내 타이핑 상태 전송 (debounce)
 */
export default function useTypingIndicator(debateId, user, mySide) {
  const [opponentTyping, setOpponentTyping] = useState(false);
  const [opponentTypingSide, setOpponentTypingSide] = useState(null);
  const [opponentTypingNickname, setOpponentTypingNickname] = useState('');
  const opponentTypingTimeout = useRef(null);
  const typingTimeout = useRef(null);

  // 상대방 타이핑 수신
  useEffect(() => {
    if (!debateId) return;
    const handler = ({ typing, side, nickname }) => {
      setOpponentTyping(typing);
      if (side) setOpponentTypingSide(side);
      if (nickname) setOpponentTypingNickname(nickname);
      clearTimeout(opponentTypingTimeout.current);
      if (typing) {
        opponentTypingTimeout.current = setTimeout(() => setOpponentTyping(false), 3000);
      }
    };
    socket.on('opponent-typing', handler);
    return () => {
      socket.off('opponent-typing', handler);
      clearTimeout(opponentTypingTimeout.current);
    };
  }, [debateId]);

  // 타이핑 emit debounce
  const emitTyping = useMemo(() => debounce((dId, uId, side) => {
    socket.emit('typing', { debateId: dId, userId: uId, typing: true, side });
  }, 300), []);

  // 타이핑 시작 알림 + 자동 종료
  const broadcastTyping = useCallback(() => {
    if (!debateId || !user?.id || !mySide) return;
    emitTyping(debateId, user.id, mySide);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing', { debateId, userId: user.id, typing: false, side: mySide });
    }, 1500);
  }, [debateId, user, mySide, emitTyping]);

  // 타이핑 즉시 종료 (pending debounce도 취소)
  const stopTyping = useCallback(() => {
    if (!debateId || !user?.id) return;
    emitTyping.cancel();
    clearTimeout(typingTimeout.current);
    socket.emit('typing', { debateId, userId: user.id, typing: false, side: mySide });
  }, [debateId, user, mySide, emitTyping]);

  return {
    opponentTyping,
    opponentTypingSide,
    opponentTypingNickname,
    broadcastTyping,
    stopTyping,
  };
}
