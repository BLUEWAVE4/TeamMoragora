import { useState, useRef, useEffect, useCallback } from 'react';
import { socket } from '../../services/socket';

/**
 * 대기실 채팅 훅
 */
export default function useLobbyChat(debateId, user) {
  const [lobbyMessages, setLobbyMessages] = useState([]);
  const [lobbyInput, setLobbyInput] = useState('');
  const lobbyChatEndRef = useRef(null);

  useEffect(() => {
    if (!debateId) return;
    const handler = (msg) => {
      if (msg.userId !== user?.id) {
        setLobbyMessages(prev => [...prev, msg]);
      }
    };
    socket.on('lobby-chat', handler);
    return () => socket.off('lobby-chat', handler);
  }, [debateId, user?.id]);

  const sendLobbyMessage = useCallback(() => {
    const trimmed = lobbyInput.trim();
    if (!trimmed || !user) return;
    const msg = { debateId, userId: user.id, nickname: user.user_metadata?.nickname || '익명', text: trimmed, timestamp: Date.now() };
    socket.emit('lobby-chat', { debateId, ...msg });
    setLobbyMessages(prev => [...prev, msg]);
    setLobbyInput('');
  }, [debateId, user, lobbyInput]);

  return {
    lobbyMessages,
    setLobbyMessages,
    lobbyInput,
    setLobbyInput,
    lobbyChatEndRef,
    sendLobbyMessage,
  };
}
