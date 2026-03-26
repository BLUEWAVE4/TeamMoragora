import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { supabase } from '../../services/supabase';
import { socket } from '../../services/socket';
import { getDebate, castCitizenVote, getCitizenVoteTally } from '../../services/api';
import { getAvatarUrl, DEFAULT_AVATAR_ICON } from '../../utils/avatar';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_CHARS = 200;
const COOLDOWN_MS = 1000;
const SCROLL_THRESHOLD = 120;
const MAX_MSGS = 20;
const DEFAULT_DURATION_MS = 15 * 60 * 1000; // 15분 고정
const EXTEND_MS = 5 * 60 * 1000;            // 5분 추가
const MAX_PER_SIDE = 3;                      // 사이드당 최대 3명

function useCountdown(deadline) {
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (!deadline) return;
    const end = new Date(deadline).getTime();
    const update = () => {
      const diff = end - Date.now();
      if (diff <= 0) { setTimeLeft(0); return; }
      setTimeLeft(Math.ceil(diff / 1000));
    };
    update();
    const t = setInterval(update, 500);
    return () => clearInterval(t);
  }, [deadline]);
  return timeLeft;
}

function formatTime(secs) {
  if (secs == null) return '--:--';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatMsgTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function ChatRoom() {
  const { debateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [gameStarted, setGameStarted] = useState(false);
  // participants: { A: [{userId, nickname, ready},...], B: [...] }
  const [participants, setParticipants] = useState({ A: [], B: [] });
  const [myReady, setMyReady] = useState(false);

  const [debate, setDebate] = useState(null);
  const [mySide, setMySide] = useState(null);
  const [myNickname, setMyNickname] = useState('');
  const [myAvatarUrl, setMyAvatarUrl] = useState('');
  const [avatarMap, setAvatarMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [msgCount, setMsgCount] = useState(0);
  const [exhaustedUsers, setExhaustedUsers] = useState({});
  const [timeChangeRequest, setTimeChangeRequest] = useState(null);
  const [filterError, setFilterError] = useState('');
const [opponentLeft, setOpponentLeft] = useState(false);
  const [citizenVote, setCitizenVote] = useState(null); // 'A' | 'B' | null
  const [citizenVoteLoading, setCitizenVoteLoading] = useState(false);
  const [voteTally, setVoteTally] = useState({ A: 0, B: 0, total: 0 });
  const [actionTarget, setActionTarget] = useState(null); // { userId, nickname, side }
  const [kickRequest, setKickRequest] = useState(null); // { targetId, targetNickname, votes, requiredCount }
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState(null); // { safe, reason }
  const [reportedUsers, setReportedUsers] = useState({}); // { [userId]: true }

  const msgEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showNewMsgBtn, setShowNewMsgBtn] = useState(false);
  const isNearBottom = useRef(true);

  const [opponentTypingSide, setOpponentTypingSide] = useState(null);
  const [opponentTyping, setOpponentTyping] = useState(false);
  const [opponentTypingNickname, setOpponentTypingNickname] = useState('');
  const typingTimeout = useRef(null);

  const [chatEnded, setChatEnded] = useState(false);
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'info'|'warning' }
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [kickSkipCountdown, setKickSkipCountdown] = useState(null); // { side, seconds }
  const endTriggered = useRef(false);

  // ===== 대기실 채팅 =====
  const [lobbyMessages, setLobbyMessages] = useState([]);
  const [lobbyInput, setLobbyInput] = useState('');
  const lobbyChatEndRef = useRef(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [chatDeadline, setChatDeadline] = useState(null);
  const chatDeadlineRef = useRef(null);
  useEffect(() => { chatDeadlineRef.current = chatDeadline; }, [chatDeadline]);
  const timeLeft = useCountdown(gameStarted ? chatDeadline : null);
  const isWarningTime = timeLeft != null && timeLeft > 0 && timeLeft <= 60;

  const isCreator = debate ? debate.creator_id === user?.id : false;

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const allReady = useCallback(() => {
  const aList = Array.isArray(participants.A) ? participants.A : [];
  const bList = Array.isArray(participants.B) ? participants.B : [];
  if (aList.length < 1 || bList.length < 1) return false;
  // 내 ready는 서버 sync 대신 myReady state로 판단
  return [...aList, ...bList].every(p =>
    p.userId === user?.id ? myReady : p.ready
  );
}, [participants, myReady, user]);

  // ===== 데이터 로드 =====
  useEffect(() => {
    if (!debateId || !user) return;
    const load = async () => {
      try {
        const data = await getDebate(debateId);
        setDebate(data);
        // 참여자 아바타 맵 구성
        const map = {};
        if (data.creator) map[data.creator_id] = data.creator.avatar_url || getAvatarUrl(data.creator_id, data.creator.gender) || DEFAULT_AVATAR_ICON;
        if (data.opponent) map[data.opponent_id] = data.opponent.avatar_url || getAvatarUrl(data.opponent_id, data.opponent.gender) || DEFAULT_AVATAR_ICON;
        setAvatarMap(map);
        // 당사자 side 복원 (모든 상태에서 공통)
        const creatorActualSide = data.creator_side || 'A';
        const opponentActualSide = creatorActualSide === 'A' ? 'B' : 'A';
        if (data.creator_id === user.id) setMySide(creatorActualSide);
        else if (data.opponent_id === user.id) setMySide(opponentActualSide);

        if (data.status === 'chatting') {
          setGameStarted(true);
          if (data.chat_deadline) setChatDeadline(data.chat_deadline);
        } else if (data.status === 'judging') {
          navigate(`/debate/${debateId}/judging`);
          return;
        } else {
          // waiting 상태 — sessionStorage에 이미 시작한 기록이 있으면 복원
          const savedSession = sessionStorage.getItem(`chat_session_${debateId}`);
          if (savedSession) {
            const { side, deadline } = JSON.parse(savedSession);
            setGameStarted(true);
            if (deadline) setChatDeadline(deadline);
          }
        }
        const { data: profile } = await supabase
          .from('profiles').select('nickname, avatar_url, gender').eq('id', user.id).single();
        setMyNickname(profile?.nickname || '익명');
        const myAvt = profile?.avatar_url || getAvatarUrl(user.id, profile?.gender) || DEFAULT_AVATAR_ICON;
        setMyAvatarUrl(myAvt);
        setAvatarMap(prev => ({ ...prev, [user.id]: myAvt }));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [debateId, user]);

  // ===== 기존 메시지 로드 =====
  useEffect(() => {
    if (!debateId) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages').select('*').eq('debate_id', debateId).order('created_at', { ascending: true });
      if (data) {
        setMessages(data);
        const mine = data.filter(m => m.user_id === user?.id).length;
        setMsgCount(mine);
        const countMap = {};
        data.forEach(m => { countMap[m.user_id] = (countMap[m.user_id] || 0) + 1; });
        const exhausted = {};
        Object.entries(countMap).forEach(([uid, cnt]) => { if (cnt >= MAX_MSGS) exhausted[uid] = true; });
        setExhaustedUsers(exhausted);
      }
    };
    fetchMessages();
  }, [debateId, user]);

  // ===== Socket.io 메시지 =====
  useEffect(() => {
    if (!debateId) return;
    socket.connect();
    socket.emit('join-room', debateId);

    const handleNewMessage = (msg) => {
      setMessages(prev => {
        if (msg.user_id === user?.id) {
          const tempIdx = prev.findIndex(m => m.id?.startsWith('temp-') && m.user_id === msg.user_id && m.content === msg.content);
          if (tempIdx >= 0) { const updated = [...prev]; updated[tempIdx] = msg; return updated; }
        }
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.user_id !== user?.id) {
        setOpponentTyping(false);
        if (!isNearBottom.current) setShowNewMsgBtn(true);
      }
    };

    const handleExhausted = ({ userId, nickname }) => {
      setExhaustedUsers(prev => ({ ...prev, [userId]: true }));
      setMessages(prev => [...prev, {
        id: `sys-exhausted-${userId}-${Date.now()}`,
        type: 'system',
        content: `${userId === user?.id ? '나' : (nickname || '상대방')}의 발언권이 모두 소진되었습니다.`,
        created_at: new Date().toISOString(),
      }]);
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-exhausted', handleExhausted);
    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('user-exhausted', handleExhausted);
      socket.emit('leave-room', debateId);
    };
  }, [debateId, user]);

  // ===== Socket.io Presence =====
  // mySide를 ref로 추적 — join-presence는 최초 1회만, side 변경은 select-side로만 처리
  const mySideRef = useRef(mySide);
  useEffect(() => { mySideRef.current = mySide; }, [mySide]);

  useEffect(() => {
    if (!debateId || !user || !myNickname) return;
    socket.emit('join-presence', { debateId, userId: user.id, nickname: myNickname, avatarUrl: myAvatarUrl, side: mySideRef.current, ready: false });
    socket.on('presence-sync', (slots) => {
      if (slots && typeof slots === 'object') {
        // 참여자 아바타 맵 업데이트
        const allParticipants = [...(slots.A || []), ...(slots.B || [])];
        if (allParticipants.length > 0) {
          setAvatarMap(prev => {
            const updated = { ...prev };
            allParticipants.forEach(p => {
              if (p.userId && p.avatarUrl) updated[p.userId] = p.avatarUrl;
            });
            return updated;
          });
        }
        setParticipants(prev => {
          const mergeWithMe = (serverList, side) => {
            const list = Array.isArray(serverList) ? serverList : [];
            const hasMe = list.some(p => p.userId === user?.id);
            if (!hasMe) {
              const meInPrev = (Array.isArray(prev[side]) ? prev[side] : []).find(p => p.userId === user?.id);
              if (meInPrev) {
                const merged = [...list, meInPrev];
                merged.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
                return merged;
              }
            }
            return list;
          };
          return {
            A: mergeWithMe(slots.A, 'A'),
            B: mergeWithMe(slots.B, 'B'),
          };
        });
      }
    });
    socket.on('opponent-typing', ({ typing, side, nickname }) => {
    setOpponentTyping(typing);
    if (side) setOpponentTypingSide(side);
    if (nickname) setOpponentTypingNickname(nickname);
    if (typing) { clearTimeout(window._typingTimeout); window._typingTimeout = setTimeout(() => setOpponentTyping(false), 3000); }
  });
    socket.on('citizen-vote-tally', (tally) => {
      if (tally) setVoteTally({ A: tally.A, B: tally.B, total: tally.total });
    });
    socket.on('duplicate-login', ({ reason }) => {
      alert(reason);
      navigate('/debate/lobby');
    });
    socket.on('countdown-start', () => {
      setCountdown(3);
    });
    socket.on('game-start', ({ chat_deadline }) => {
      setCountdown(null);
      setGameStarted(true);
      if (chat_deadline) setChatDeadline(chat_deadline);
      sessionStorage.setItem(`chat_session_${debateId}`, JSON.stringify({ side: mySide || null, deadline: chat_deadline }));
      // 대기실 참여 알림 제거 후 안내 메시지만 표시
      setMessages([{
        id: `sys-help-${Date.now()}`,
        type: 'system',
        content: '/help 를 입력하면 다양한 명령어를 확인할 수 있습니다.',
        created_at: new Date().toISOString(),
      }]);
    });
    socket.on('time-update', ({ chat_deadline }) => setChatDeadline(chat_deadline));
    socket.on('time-change-request', ({ type, votes, requiredCount }) => {
  setTimeChangeRequest({ type, votes, requiredCount });
  // 이미 메시지가 있으면 업데이트, 없으면 추가
  setMessages(prev => {
    const existingIdx = prev.findIndex(m => m.id === 'sys-time-vote');
    const voteMsg = {
      id: 'sys-time-vote',
      type: 'vote',
      voteType: type,
      votes,
      requiredCount,
      created_at: new Date().toISOString(),
    };
    if (existingIdx >= 0) {
      const updated = [...prev];
      updated[existingIdx] = voteMsg;
      return updated;
    }
    return [...prev, voteMsg];
  });
});

    socket.on('time-change-approved', ({ type, chat_deadline }) => {
  setTimeChangeRequest(null);
  if (chat_deadline) setChatDeadline(chat_deadline);
  const saved = sessionStorage.getItem(`chat_session_${debateId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      sessionStorage.setItem(`chat_session_${debateId}`, JSON.stringify({ ...parsed, deadline: chat_deadline }));
    }
  setMessages(prev => [
    ...(type === 'extend'
      ? prev.filter(m => m.id !== 'sys-time-vote') 
      : prev),
    {
      id: `sys-time-${Date.now()}`,
      type: 'system',
      content: type === 'skip'
        ? '[알림] 모든 참여자 동의로 시간이 스킵되었습니다.'
        : '[알림] 모든 참여자 동의로 5분이 추가되었습니다.',
      created_at: new Date().toISOString(),
    }
  ]);
});

    socket.on('time-change-cancelled', () => {
  setTimeChangeRequest(null);
  setMessages(prev => [
    ...prev.filter(m => m.id !== 'sys-time-vote'),
    {
      id: `sys-cancelled-${Date.now()}`,
      type: 'system',
      content: '[알림] 시간 변경이 거부되었습니다.',
      created_at: new Date().toISOString(),
    }
  ]);
});
socket.on('filter-blocked', ({ reason }) => {
  // optimistic 메시지 제거 (차단된 메시지는 채팅룸에 안 보이게)
  setMessages(prev => prev.filter(m => !m.id?.startsWith('temp-') || m.user_id !== user?.id));
  setMsgCount(prev => Math.max(0, prev - 1)); // 발언권 복구
  setFilterError(reason || '부적절한 표현이 감지되었습니다.');
  setTimeout(() => setFilterError(''), 3000);
});

socket.on('opponent-left', ({ nickname }) => {
  setOpponentLeft(true);
  showToast(`${nickname || '참여자'}님이 자리를 비웠습니다`, 'warning');
});

socket.on('opponent-returned', () => {
  setOpponentLeft(false);
  showToast('참여자가 돌아왔습니다', 'info');
});

socket.on('chat-auto-ended', () => {
  sessionStorage.removeItem(`chat_session_${debateId}`);
  if (endTriggered.current) return;
  endTriggered.current = true;
  setGameStarted(true); // 대기 오버레이 닫기
  setChatEnded(true);
  setMessages(prev => [...prev, {
    id: `sys-auto-end-${Date.now()}`,
    type: 'system',
    content: '상대방 이탈로 논쟁이 종료되었습니다.',
    created_at: new Date().toISOString(),
  }]);
  setTimeout(() => setShowEndOverlay(true), 500);
  setTimeout(() => navigate(`/debate/${debateId}/judging`), 3500);
});
// ===== 채팅 종료/취소 =====
socket.on('chat-ended', () => {
  sessionStorage.removeItem(`chat_session_${debateId}`);
  if (endTriggered.current) return;
  endTriggered.current = true;
  setChatEnded(true);
  setMessages(prev => [...prev, {
    id: `sys-ended-${Date.now()}`,
    type: 'system',
    content: '논쟁이 종료되었습니다. 판결을 진행합니다.',
    created_at: new Date().toISOString(),
  }]);
  setTimeout(() => setShowEndOverlay(true), 500);
  setTimeout(() => navigate(`/debate/${debateId}/judging`), 3500);
});

socket.on('chat-cancelled', () => {
  sessionStorage.removeItem(`chat_session_${debateId}`);
  if (endTriggered.current) return;
  endTriggered.current = true;
  setChatEnded(true);
  setIsCancelled(true);
  setMessages(prev => [...prev, {
    id: `sys-cancelled-${Date.now()}`,
    type: 'system',
    content: '이 논쟁은 진행이 취소되었습니다.',
    created_at: new Date().toISOString(),
  }]);
  setTimeout(() => setShowEndOverlay(true), 500);
  setTimeout(() => navigate('/debate/lobby'), 3500);
});

// ===== 강퇴 투표 =====
socket.on('kick-request', ({ targetId, targetNickname, votes, requiredCount }) => {
  setKickRequest({ targetId, targetNickname, votes, requiredCount });
});
socket.on('kick-approved', ({ targetId, targetNickname }) => {
  setKickRequest(null);
  if (targetId === user?.id) {
    // 본인이 강퇴됨
    setMessages(prev => [...prev, { id: `sys-kicked-${Date.now()}`, type: 'system', content: '강퇴 투표로 퇴장되었습니다.', created_at: new Date().toISOString() }]);
    setChatEnded(true);
    setTimeout(() => navigate('/debate/lobby'), 2000);
  } else {
    setMessages(prev => [...prev, { id: `sys-kicked-${Date.now()}`, type: 'system', content: `${targetNickname}님이 강퇴되었습니다.`, created_at: new Date().toISOString() }]);
  }
});
socket.on('kick-cancelled', ({ reason }) => {
  setKickRequest(null);
  setMessages(prev => [...prev, { id: `sys-kick-cancel-${Date.now()}`, type: 'system', content: reason || '강퇴 투표가 부결되었습니다.', created_at: new Date().toISOString() }]);
});
// 참여자 입장 시스템 메시지
socket.on('participant-joined', ({ message }) => {
  setMessages(prev => [...prev, { id: `sys-join-${Date.now()}`, type: 'system', content: message, created_at: new Date().toISOString() }]);
  // 대기실 채팅에도 입장 알림
  setLobbyMessages(prev => [...prev, { id: `lobby-sys-join-${Date.now()}`, type: 'system', text: message, timestamp: Date.now() }]);
});
// 대기실 채팅 메시지 수신
socket.on('lobby-chat', (msg) => {
  if (msg.userId !== user?.id) {
    setLobbyMessages(prev => [...prev, msg]);
  }
});
// 강퇴된 유저 재참여 차단
socket.on('kicked-blocked', ({ reason }) => {
  setChatEnded(true);
  setMessages(prev => [...prev, { id: `sys-blocked-${Date.now()}`, type: 'system', content: reason, created_at: new Date().toISOString() }]);
  setTimeout(() => navigate('/debate/lobby'), 2000);
});
// 강퇴 후 빈 사이드 스킵 카운트다운
socket.on('kick-skip-countdown', ({ side, seconds }) => {
  setKickSkipCountdown({ side, seconds });
  setMessages(prev => [...prev, { id: `sys-kick-skip-${Date.now()}`, type: 'system', content: `${side}측 참여자가 없습니다. ${seconds}초 후 논쟁이 종료됩니다.`, created_at: new Date().toISOString() }]);
});

    return () => {
      socket.emit('leave-presence', { debateId, userId: user.id });
      socket.off('presence-sync');
      socket.off('opponent-typing');
      socket.off('game-start');
      socket.off('time-update');
      socket.off('time-change-request');
      socket.off('time-change-approved');
      socket.off('time-change-cancelled');
      socket.off('filter-blocked');
      socket.off('opponent-left');
      socket.off('opponent-returned');
      socket.off('kick-request');
      socket.off('kick-approved');
      socket.off('kick-cancelled');
      socket.off('participant-joined');
      socket.off('kicked-blocked');
      socket.off('kick-skip-countdown');
      socket.off('lobby-chat');
      socket.off('citizen-vote-tally');
      socket.off('duplicate-login');
      socket.off('chat-auto-ended');
      socket.off('chat-ended');
      socket.off('chat-cancelled');
    };
  }, [debateId, user, myNickname]);

  // ===== 사이드 선택 (3명 제한) =====
  const selectSide = useCallback((side) => {
  if (gameStarted || myReady) return;
  const sideList = Array.isArray(participants[side]) ? participants[side] : [];
  if (sideList.length >= MAX_PER_SIDE && !sideList.some(p => p.userId === user.id)) return;
  const newSide = mySide === side ? null : side;
  setMySide(newSide);

  // 로컬 participants에 즉시 반영 (소켓 응답 전 UI 선반영)
  setParticipants(prev => {
    const prevA = Array.isArray(prev.A) ? prev.A : [];
    const prevB = Array.isArray(prev.B) ? prev.B : [];
    // 기존 사이드에서 나 제거
    const cleanA = prevA.filter(p => p.userId !== user.id);
    const cleanB = prevB.filter(p => p.userId !== user.id);
    const me = { userId: user.id, nickname: myNickname, side: newSide, ready: false };
    if (newSide === 'A') return { A: [...cleanA, me], B: cleanB };
    if (newSide === 'B') return { A: cleanA, B: [...cleanB, me] };
    return { A: cleanA, B: cleanB };
  });

  socket.emit('select-side', { debateId, userId: user.id, nickname: myNickname, avatarUrl: myAvatarUrl, side: newSide, ready: false });
}, [mySide, participants, user, myNickname, gameStarted, myReady, debateId]);

  // ===== 준비완료 토글 =====
  const toggleReady = useCallback(() => {
  if (!mySide || gameStarted) return;
  const newReady = !myReady;
  setMyReady(newReady);

  // 로컬 즉시 반영
  setParticipants(prev => {
    const prevSide = Array.isArray(prev[mySide]) ? prev[mySide] : [];
    const updated = prevSide.map(p =>
      p.userId === user.id ? { ...p, ready: newReady } : p
    );
    return { ...prev, [mySide]: updated };
  });

  socket.emit('select-side', { debateId, userId: user.id, nickname: myNickname, avatarUrl: myAvatarUrl, side: mySide, ready: newReady });
}, [mySide, myReady, gameStarted, debateId, user, myNickname]);

  // ===== 대기실 채팅 전송 =====
  const sendLobbyChat = useCallback(() => {
    const t = lobbyInput.trim();
    if (!t) return;
    const msg = {
      id: `lobby-${user?.id}-${Date.now()}`,
      type: 'chat',
      userId: user?.id,
      nickname: myNickname,
      avatarUrl: myAvatarUrl,
      text: t,
      timestamp: Date.now(),
    };
    socket.emit('lobby-chat', { debateId, ...msg });
    setLobbyMessages(prev => [...prev, msg]);
    setLobbyInput('');
  }, [lobbyInput, user, myNickname, myAvatarUrl, debateId]);

  useEffect(() => {
    lobbyChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lobbyMessages]);

  // ===== 게임 시작 카운트다운 =====
  const [countdown, setCountdown] = useState(null); // 3, 2, 1, 0(GO)

  const handleStart = () => {
    if (!isCreator || !allReady() || countdown !== null) return;
    // 카운트다운 시작 — 소켓으로 전체 브로드캐스트
    socket.emit('start-countdown', { debateId });
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0) {
      // GO! 표시 후 게임 시작
      const timer = setTimeout(() => {
        setCountdown(null);
        if (isCreator) socket.emit('start-game', { debateId });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [countdown, isCreator, debateId]);

  // ===== 시민 투표 (관전자 전용) =====
  // loading 중에는 side가 아직 복원 안 됐으므로 시민으로 판별하지 않음
  const isCitizen = gameStarted && !loading && !mySide && user && debate && debate.creator_id !== user.id && debate.opponent_id !== user.id;

  // 시민투표 집계 — 게임 시작 후 모든 유저가 확인 가능
  useEffect(() => {
    if (!gameStarted || !debateId) return;
    getCitizenVoteTally(debateId).then(res => {
      const d = res.data || res;
      setVoteTally({ A: d.A, B: d.B, total: d.total });
      if (d.myVote) setCitizenVote(d.myVote);
    }).catch(() => {});
  }, [gameStarted, debateId]);

  const handleCitizenVote = async (side) => {
    if (citizenVoteLoading) return;
    setCitizenVoteLoading(true);
    try {
      await castCitizenVote(debateId, side);
      setCitizenVote(side);
      // 집계 갱신 + 전체 브로드캐스트
      const res = await getCitizenVoteTally(debateId);
      const d = res.data || res;
      const tally = { A: d.A, B: d.B, total: d.total };
      setVoteTally(tally);
      socket.emit('citizen-vote-update', { debateId, tally });
    } catch (e) { console.error(e); }
    finally { setCitizenVoteLoading(false); }
  };

const handleSkipTime = () => {
  if (timeChangeRequest) return;
  socket.emit('request-time-change', { debateId, userId: user.id, type: 'skip', currentDeadline: chatDeadlineRef.current });
};

const handleExtendTime = () => {
  if (timeChangeRequest) return;
  socket.emit('request-time-change', { debateId, userId: user.id, type: 'extend', currentDeadline: chatDeadlineRef.current });
};

const handleVote = (agree) => {
  socket.emit('vote-time-change', { debateId, userId: user.id, agree });
  if (!agree) setTimeChangeRequest(null);
};

  // ===== 타이머 종료 =====
  useEffect(() => {
    if (timeLeft === 0 && !endTriggered.current) {
      endTriggered.current = true;
      setChatEnded(true);
      sessionStorage.removeItem(`chat_session_${debateId}`); // ← 추가
      setTimeout(() => setShowEndOverlay(true), 500);
      setTimeout(() => navigate(`/debate/${debateId}/judging`), 3500);
    }
  }, [timeLeft, debateId, navigate]);

  useEffect(() => {
    if (isNearBottom.current) msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, opponentTyping]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottom.current = dist < SCROLL_THRESHOLD;
    if (isNearBottom.current) setShowNewMsgBtn(false);
  }, []);

  useEffect(() => {
    if (!window.visualViewport) return;
    const onResize = () => {
      const diff = window.innerHeight - window.visualViewport.height;
      setKeyboardHeight(diff > 0 ? diff : 0);
    };
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport.removeEventListener('resize', onResize);
  }, []);

  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    setMsgError('');
    socket.emit('typing', { debateId, userId: user.id, typing: true, side: mySide });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit('typing', { debateId, userId: user.id, typing: false, side: mySide }), 1500);
  }, [debateId, user, mySide]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || cooldown || chatEnded) return;

    // ===== 명령어 처리 (참여자 + 관전자 모두 가능) =====
    const cmd = trimmed.toLowerCase();
    if (cmd === '/help' || cmd === '/도움') {
      setText('');
      setShowHelpPanel(true);
      setTimeout(() => setShowHelpPanel(false), 5000);
      return;
    }
    if (cmd === '/스킵' || cmd === '/skip') {
      setText('');
      if (!mySide) { setMsgError('참여자만 사용할 수 있습니다.'); setTimeout(() => setMsgError(''), 2000); return; }
      if (timeChangeRequest) { setMsgError('이미 투표가 진행 중입니다.'); setTimeout(() => setMsgError(''), 2000); return; }
      handleSkipTime();
      return;
    }
    if (cmd === '/시간추가' || cmd === '/+5') {
      setText('');
      if (!mySide) { setMsgError('참여자만 사용할 수 있습니다.'); setTimeout(() => setMsgError(''), 2000); return; }
      if (timeChangeRequest) { setMsgError('이미 투표가 진행 중입니다.'); setTimeout(() => setMsgError(''), 2000); return; }
      handleExtendTime();
      return;
    }

    // 알 수 없는 명령어
    if (trimmed.startsWith('/')) {
      setText('');
      showToast('알 수 없는 명령어입니다. /help 를 입력해보세요.', 'warning');
      return;
    }

    // ===== 일반 메시지 =====
    if (!mySide) return;
    if (trimmed.length > MAX_CHARS) return;
    if (msgCount >= MAX_MSGS) { setMsgError(`발언권(${MAX_MSGS}개)을 모두 사용했습니다.`); return; }

    setSending(true);
    setCooldown(true);
    setText('');
    socket.emit('typing', { debateId, userId: user.id, typing: false });

    const newCount = msgCount + 1;
    const optimisticMsg = { id: `temp-${Date.now()}`, debate_id: debateId, user_id: user.id, nickname: myNickname, content: trimmed, side: mySide, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticMsg]);
    setMsgCount(newCount);

    if (newCount >= MAX_MSGS) {
      setExhaustedUsers(prev => ({ ...prev, [user.id]: true }));
      socket.emit('user-exhausted', { debateId, userId: user.id, nickname: myNickname });
    }

    socket.emit('send-message', { debateId, userId: user.id, nickname: myNickname, content: trimmed, side: mySide });
    setSending(false);
    setTimeout(() => setCooldown(false), COOLDOWN_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, sending, cooldown, chatEnded, mySide, msgCount, debateId, user, myNickname, timeChangeRequest]);

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const scrollToBottom = () => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setShowNewMsgBtn(false); };

  if (loading) return (
    <div className="fixed inset-0 bg-[#0f1829] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <span className="text-white/40 text-sm font-bold">논쟁 준비 중...</span>
      </div>
    </div>
  );

  const isInputDisabled = !gameStarted || chatEnded || timeLeft === 0 || !mySide || !!exhaustedUsers[user?.id];
  const remainingMsgs = MAX_MSGS - msgCount;

  return (
    <div className="flex overflow-hidden flex-col bg-[#0f1829]" style={{ height: 'calc(100dvh - var(--tab-h, 60px))', paddingBottom: keyboardHeight }}>

      {/* ━━━━━ 대기 오버레이 (3v3 준비방) ━━━━━ */}
      {!loading && !gameStarted && (
        <div className="absolute inset-0 z-30 overflow-y-auto" style={{ backgroundColor: '#0f1829' }}>
          {/* 상단 토스트 알림 (대기실) */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className={`px-4 py-2 flex items-center justify-center gap-2 ${
                  toast.type === 'warning' ? 'bg-amber-500/20 border-b border-amber-500/30' : 'bg-emerald-500/20 border-b border-emerald-500/30'
                }`}>
                <span className={`text-[11px] font-black ${toast.type === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {toast.message}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex flex-col items-center gap-5 px-5 py-10 min-h-full justify-center">

            {/* 논제 + 태그 */}
            <div className="w-full bg-white/[0.04] border border-white/8 rounded-2xl px-5 py-4 text-center">
              <p className="text-[#D4AF37]/50 text-[10px] font-black uppercase tracking-widest mb-1">논제</p>
              <h2 className="text-white text-[17px] font-black leading-snug">{debate?.topic || ''}</h2>
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                {debate?.category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40 font-bold">{debate.category}</span>}
                {debate?.purpose && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40 font-bold">{debate.purpose}</span>}
                {debate?.lens && debate.lens !== '미선택' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold">{debate.lens}</span>}
              </div>
            </div>

            {/* A/B 슬롯 (3v3) */}
            <div className="w-full grid grid-cols-2 gap-3">
              {['A', 'B'].map(side => (
                <div key={side} className="flex flex-col gap-2">
                  <p className={`text-[11px] font-black uppercase tracking-widest text-center ${side === 'A' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {side === 'A' ? 'A측' : 'B측'}
                  </p>
                  <p className="text-white/40 text-[10px] text-center leading-snug line-clamp-2">
                    {side === 'A' ? debate?.pro_side : debate?.con_side}
                  </p>
                  {[0, 1, 2].map(i => {
                    const sideList = Array.isArray(participants[side]) ? participants[side] : [];
                    const p = sideList[i];
                    const isMe = p?.userId === user?.id;
                    const isMySide = mySide === side;
                    const isFull = sideList.length >= MAX_PER_SIDE;
                    const isA = side === 'A';

                    const borderColor = p
                      ? (isMe ? (isA ? 'border-emerald-400/60' : 'border-red-400/60') : 'border-white/10')
                      : (isA ? 'border-emerald-800/40' : 'border-red-800/40');
                    const bgColor = p
                      ? (isMe ? (isA ? 'bg-emerald-500/20' : 'bg-red-500/20') : 'bg-white/5')
                      : 'bg-transparent';

                    return (
                      <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all overflow-visible ${borderColor} ${bgColor} ${!p ? 'border-dashed' : ''}`}>
                        {p ? (
                          <>
                            <div className="relative w-6 h-6 shrink-0">
                              <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                                <img src={p.avatarUrl || DEFAULT_AVATAR_ICON} alt="" className="w-full h-full object-cover" />
                              </div>
                              {p.userId === debate?.creator_id && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-50 text-[7px] text-[#D4AF37] bg-[#1a2744] px-1 py-0.5 rounded-full font-black leading-none border border-[#D4AF37]/40 whitespace-nowrap">방장</span>
                              )}
                            </div>
                            <span className={`text-[11px] font-bold truncate flex-1 ${isMe ? (isA ? 'text-emerald-300' : 'text-red-300') : 'text-white/70'}`}>
                              {p.nickname}
                            </span>
                            {p.ready
                              ? <span className={`text-[9px] font-black shrink-0 ${isA ? 'text-emerald-400' : 'text-red-400'}`}>준비완료</span>
                              : isMe && <span className="text-[9px] text-white/30 shrink-0">대기중</span>
                            }
                          </>
                        ) : (
                          <button
                            onClick={() => selectSide(side)}
                            disabled={isMySide || isFull || myReady}
                            className={`w-full text-center text-[10px] font-bold py-0.5 transition-opacity disabled:opacity-30
                              ${isA ? 'text-emerald-600' : 'text-red-600'}`}
                          >
                            {isFull ? '가득 참' : '+ 선택'}
                          </button>
                        )}
                      </div>
                    );
                  })}

                </div>
              ))}
            </div>

            {/* 준비완료 버튼 */}
            {mySide && (
              <button onClick={toggleReady}
                className={`w-full py-3.5 rounded-2xl font-black text-[14px] transition-all active:scale-[0.97] border-2 ${
                  myReady ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300' : 'bg-white/5 border-white/10 text-white/50'
                }`}>
                {myReady ? '준비완료' : '준비'}
              </button>
            )}

            {/* 시작 버튼 (방장) */}
            {isCreator ? (
              <button onClick={handleStart} disabled={!allReady()}
                className={`w-full py-4 rounded-2xl font-black text-[15px] uppercase tracking-wider transition-all active:scale-[0.97] ${
                  allReady() ? 'bg-[#D4AF37] text-[#0a0f1a] shadow-[0_0_30px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}>
                {allReady() ? '논쟁 시작' : '모든 참여자가 준비를 완료하여야 합니다.'}
              </button>
            ) : (
              <div className="w-full py-4 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                <span className="text-white/30 text-[13px] font-bold">
                  {!mySide ? '입장을 선택하세요' : !myReady ? '준비완료를 눌러주세요' : '방장이 게임을 곧 시작합니다.'}
                </span>
              </div>
            )}
          </div>

          {/* ━━━━━ 카운트다운 오버레이 ━━━━━ */}
          <AnimatePresence>
            {countdown !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(10,15,26,0.95)' }}
              >
                <div className="flex flex-col items-center gap-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={countdown}
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="flex flex-col items-center"
                    >
                      {countdown > 0 ? (
                        <span className="text-[80px] font-black text-[#D4AF37] leading-none drop-shadow-[0_0_40px_rgba(212,175,55,0.5)]">
                          {countdown}
                        </span>
                      ) : (
                        <span className="text-[60px] font-black text-emerald-400 leading-none drop-shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                          GO!
                        </span>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-white/40 text-[13px] font-bold"
                  >
                    {countdown > 0 ? '논쟁이 곧 시작됩니다' : '논쟁 시작!'}
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ━━━━━ 헤더 ━━━━━ */}
      <div className="shrink-0 sticky top-0 z-20 bg-gradient-to-b from-[#1B2A4A] to-[#0f1829] px-4 pt-10 pb-3 border-b border-white/5">
        {/* 1. 논쟁 제목 + 태그 */}
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center mb-1">실시간 논쟁</p>
        <h1 className="text-white text-[15px] font-black text-center leading-snug line-clamp-2 px-8">{debate?.topic || ''}</h1>
        <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
          {debate?.category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/30 font-bold">{debate.category}</span>}
          {debate?.purpose && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/30 font-bold">{debate.purpose}</span>}
          {debate?.lens && debate.lens !== '미선택' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37]/70 font-bold">{debate.lens}</span>}
        </div>

        {/* A/B + 타이머 + 시간 버튼 */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-col items-start gap-0.5">
            <span className={`text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold self-start ${mySide === 'A' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>나</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-400 max-w-[120px] leading-tight break-keep">{debate?.pro_side || 'A측'}</span>
            </div>
          </div>

          {/* 2. 타이머 + 스킵/추가 버튼 */}
          <div className="flex flex-col items-center gap-1">
            <span className={`text-2xl font-black tabular-nums leading-none ${isWarningTime ? 'animate-pulse' : ''}`}
              style={{ color: isWarningTime ? '#ef4444' : '#D4AF37' }}>
              {formatTime(timeLeft)}
            </span>
            {/* 남은 시간 텍스트 삭제 — 타이머만 표시 */}
          </div>

            <div className="flex flex-col items-end gap-0.5">
            <span className={`text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold self-end ${mySide === 'B' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>나</span>
            <div className="flex items-center gap-1.5 flex-row-reverse">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[11px] font-bold text-red-400 max-w-[120px] leading-tight break-keep text-right">{debate?.con_side || 'B측'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━━ 시민투표 게이지바 ━━━━━ */}
      {gameStarted && (
        <div className="shrink-0 px-4 py-2 bg-[#0f1829]/80 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold text-emerald-400">A측 {voteTally.A}표</span>
            <span className="text-[9px] font-bold text-white/30">시민투표 {voteTally.total}표</span>
            <span className="text-[9px] font-bold text-red-400">B측 {voteTally.B}표</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden flex">
            {voteTally.total > 0 ? (
              <>
                <div className="h-full bg-emerald-500 transition-all duration-500 rounded-l-full"
                  style={{ width: `${(voteTally.A / voteTally.total) * 100}%` }} />
                <div className="h-full bg-red-500 transition-all duration-500 rounded-r-full"
                  style={{ width: `${(voteTally.B / voteTally.total) * 100}%` }} />
              </>
            ) : (
              <div className="h-full w-full bg-white/5" />
            )}
          </div>
        </div>
      )}

      {/* ━━━━━ 상단 토스트 알림 ━━━━━ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className={`shrink-0 px-4 py-2 flex items-center justify-center gap-2 ${
              toast.type === 'warning' ? 'bg-amber-500/20 border-b border-amber-500/30' : 'bg-emerald-500/20 border-b border-emerald-500/30'
            }`}>
            <span className={`text-[11px] font-black ${toast.type === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {toast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━ 명령어 도움말 패널 ━━━━━ */}
      <AnimatePresence>
        {showHelpPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, opacity: { duration: 0.15 } }}
            className="shrink-0 bg-[#D4AF37]/10 border-b border-[#D4AF37]/20 px-4 py-3 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-[#D4AF37]">명령어 목록</span>
              <button onClick={() => setShowHelpPanel(false)} className="text-white/30 text-[10px] font-bold active:scale-90">닫기</button>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">/스킵</span>
                <span className="text-[10px] text-white/40">or /skip — 시간 스킵 투표</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">/+5</span>
                <span className="text-[10px] text-white/40">or /시간추가 — 5분 연장 투표</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-md">/help</span>
                <span className="text-[10px] text-white/40">or /도움 — 이 도움말 표시</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━ 메시지 영역 ━━━━━ */}
      <div ref={scrollContainerRef} onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col" style={{ overscrollBehavior: 'contain' }}>

        {/* 메시지가 적을 때 아래쪽으로 밀어주는 스페이서 */}
        <div className="flex-1" />

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 opacity-40">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p className="text-white/40 text-sm font-bold">논쟁을 시작해보세요</p>
          </div>
        )}

        <div className="space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            // 3. 시스템 메시지 (발언권 소진)
            if (msg.type === 'system') {
              return (
                <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                  <span className="text-[10px] text-amber-400/50 bg-amber-400/10 px-3 py-1 rounded-full">{msg.content}</span>
                </motion.div>
              );
            }

            {/* 투표 메시지는 인라인에서 제거 — 하단 sticky 영역에서 렌더링 */}
            if (msg.type === 'vote') return null;

            const isMe = msg.user_id === user?.id;
            const isA = msg.side === 'A';
            const nickname = msg.nickname || '익명';
            const avatar = avatarMap[msg.user_id] || DEFAULT_AVATAR_ICON;
            const isExhausted = exhaustedUsers[msg.user_id];

            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div
                  role="button"
                  tabIndex={isMe || !mySide ? -1 : 0}
                  onClick={(e) => { e.stopPropagation(); if (!isMe && mySide) setActionTarget({ userId: msg.user_id, nickname, side: msg.side }); }}
                  className={`w-8 h-8 rounded-full overflow-hidden shrink-0 bg-white/10 transition-all select-none ${
                    isMe || !mySide ? 'cursor-default' : 'cursor-pointer active:scale-90'
                  }`}
                >
                  <img src={avatar} alt="" className="w-full h-full object-cover pointer-events-none select-none" draggable={false} />
                </div>
                <div className={`flex flex-col gap-1 max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className={`text-[10px] font-bold px-1 ${isA ? 'text-emerald-400' : 'text-red-400'}`}>
                      {nickname}
                      <span className={`ml-1 text-[9px] ${isA ? 'text-emerald-500/60' : 'text-red-500/60'}`}>{isA ? 'A측' : 'B측'}</span>
                    </span>
                    {/* 3. 발언권 소진 뱃지 */}
                    {isExhausted && <span className="text-[8px] text-amber-400/70 bg-amber-400/10 px-1.5 py-0.5 rounded-full font-bold">소진</span>}
                  </div>
                  <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words ${
                      isA ? isMe
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 rounded-br-sm'
                        : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-bl-sm'
                      : isMe
                        ? 'bg-red-500/20 border border-red-500/30 text-red-100 rounded-bl-sm'
                        : 'bg-red-500/10 border border-red-500/20 text-red-200 rounded-br-sm'
                    }`}>{msg.content}</div>
                    <span className="text-[9px] text-white/20 shrink-0 pb-0.5">{formatMsgTime(msg.created_at)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <AnimatePresence>
          {opponentTyping && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              className="flex items-end gap-2 flex-row mt-3">
              <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
              <div className="flex flex-col gap-1 items-start">
                <span className={`text-[10px] font-bold px-1 ${opponentTypingSide === 'A' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {opponentTypingNickname || '상대방'}
                </span>
                <div className={`px-4 py-3 rounded-2xl border ${opponentTypingSide === 'A' ? 'bg-emerald-500/10 border-emerald-500/20 rounded-bl-sm' : 'bg-red-500/10 border-red-500/20 rounded-bl-sm'}`}>
                  <div className="flex gap-1 items-center h-4">
                    {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={msgEndRef} />
        </div>
      </div>

      <AnimatePresence>
        {showNewMsgBtn && (
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-[#1B2A4A] rounded-full text-[12px] font-black shadow-lg active:scale-95 transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
            새 메시지
          </motion.button>
        )}
      </AnimatePresence>

      {/* ━━━━━ 시간 투표 (sticky, 메시지에 밀리지 않음) ━━━━━ */}
      <AnimatePresence>
        {timeChangeRequest && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="shrink-0 px-4 py-3 bg-[#0f1829] border-t border-amber-500/20">
            <div className="w-full max-w-[320px] mx-auto bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex flex-col items-center gap-2">
              <span className="text-[11px] text-amber-400 font-black">
                {timeChangeRequest.type === 'skip' ? '시간 스킵 요청' : '5분 추가 요청'}
              </span>
              <span className="text-[10px] text-white/30">
                {Object.keys(timeChangeRequest.votes || {}).length}/{timeChangeRequest.requiredCount}명 동의
              </span>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${(Object.keys(timeChangeRequest.votes || {}).length / timeChangeRequest.requiredCount) * 100}%` }} />
              </div>
              {!mySide ? (
                <span className="text-[10px] text-white/20 font-bold">입장 선택자만 투표 가능</span>
              ) : !timeChangeRequest.votes?.[user?.id] ? (
                <div className="flex gap-2 mt-1">
                  <button onClick={() => handleVote(true)} className="px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-black active:scale-90 transition-all">동의</button>
                  <button onClick={() => handleVote(false)} className="px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-black active:scale-90 transition-all">거부</button>
                </div>
              ) : (
                <span className="text-[10px] text-emerald-400/60 font-bold">동의하셨습니다.</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━ 입력창 ━━━━━ */}
      <AnimatePresence>
        {!chatEnded && (
          <motion.div initial={{ y: 0 }} exit={{ y: 100, opacity: 0 }} transition={{ duration: 0.4, ease: 'easeIn' }}
            className="shrink-0 bg-[#0f1829] border-t border-white/5 px-4 py-3"
            style={{ paddingBottom: `max(12px, env(safe-area-inset-bottom))` }}>
            <AnimatePresence>
              {msgError && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="text-red-400 text-[11px] font-bold mb-2 px-1">⚠ {msgError}</motion.p>
              )}
            </AnimatePresence>
            {/* 비속어 차단 에러 — 바로 아래에 추가 */}
            <AnimatePresence>
              {filterError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="text-red-400 text-[11px] font-bold mb-2 px-1">
                  {filterError}
                </motion.p>
              )}
            </AnimatePresence>
            {mySide && (
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] text-white/20">
                  남은 발언권{' '}
                  <span className={`font-bold ${remainingMsgs <= 5 ? 'text-amber-400' : 'text-white/40'}`}>{remainingMsgs}개</span>
                </span>
                <span className={`text-[10px] font-bold ${text.length > MAX_CHARS * 0.9 ? 'text-amber-400' : 'text-white/20'}`}>
                  {text.length} / {MAX_CHARS}
                </span>
              </div>
            )}

            {/* 3. 시민 투표 or 채팅 입력 */}
            {isCitizen ? (
  // 시민(관전자) — 투표 UI
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-center gap-2 mb-1">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#D4AF37]">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <span className="text-[#D4AF37] text-[11px] font-black">시민 투표 — 어느 쪽이 더 설득력 있나요?</span>
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => handleCitizenVote('A')}
        disabled={citizenVoteLoading}
        className={`flex-1 py-3 rounded-xl font-black text-[13px] transition-all active:scale-[0.97] border-2 ${
          citizenVote === 'A'
            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
            : 'bg-white/5 border-white/10 text-white/50 hover:border-emerald-400/40'
        }`}
      >
        <span className="block text-[10px] text-emerald-400/60 mb-0.5">A측</span>
        {debate?.pro_side || 'A측'}
        {voteTally.total > 0 && <span className="block text-[10px] mt-1 opacity-60">{voteTally.A}표</span>}
      </button>
      <button
        onClick={() => handleCitizenVote('B')}
        disabled={citizenVoteLoading}
        className={`flex-1 py-3 rounded-xl font-black text-[13px] transition-all active:scale-[0.97] border-2 ${
          citizenVote === 'B'
            ? 'bg-red-500/20 border-red-400 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
            : 'bg-white/5 border-white/10 text-white/50 hover:border-red-400/40'
        }`}
      >
        <span className="block text-[10px] text-red-400/60 mb-0.5">B측</span>
        {debate?.con_side || 'B측'}
        {voteTally.total > 0 && <span className="block text-[10px] mt-1 opacity-60">{voteTally.B}표</span>}
      </button>
    </div>
    {citizenVote && (
      <p className="text-center text-[10px] text-white/30">투표 완료 — 다른 쪽을 눌러 변경할 수 있습니다</p>
    )}
  </div>
) : exhaustedUsers[user?.id] ? (
  <div className="flex items-center justify-center py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
    <span className="text-amber-400 text-[12px] font-bold">발언권을 모두 사용했습니다</span>
  </div>
) : (
  <div className="flex items-end gap-2">
    <div className={`w-1 h-9 rounded-full shrink-0 ${mySide === 'A' ? 'bg-emerald-500' : mySide === 'B' ? 'bg-red-500' : 'bg-white/20'}`} />
                <textarea value={text} onChange={handleTextChange} onKeyDown={handleKeyDown}
                  disabled={isInputDisabled} maxLength={MAX_CHARS} rows={1}
                  placeholder={chatEnded || timeLeft === 0 ? '논쟁이 종료되었습니다' : !mySide ? '입장을 선택해주세요' : `${mySide === 'A' ? 'A측' : 'B측'} 주장을 입력하세요...`}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20 transition-colors leading-relaxed disabled:opacity-40"
                  style={{ minHeight: '42px', maxHeight: '100px' }}
                  onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
                />
                <button onClick={handleSend} disabled={isInputDisabled || !text.trim() || cooldown || sending}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                    !isInputDisabled && text.trim() && !cooldown ? (mySide === 'A' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'bg-white/5 text-white/20'
                  }`}>
                  {sending ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━ 아바타 액션시트 (강퇴/신고) ━━━━━ */}
      <AnimatePresence>
        {actionTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActionTarget(null)}
              className="absolute inset-0 bg-black/40 z-[60]" />
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 z-[61] bg-[#1a2744] rounded-t-2xl border-t border-white/10 p-5">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10">
                  <img src={avatarMap[actionTarget.userId] || DEFAULT_AVATAR_ICON} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-white text-[14px] font-black">{actionTarget.nickname}</p>
                  <p className={`text-[11px] font-bold ${actionTarget.side === 'A' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {actionTarget.side === 'A' ? 'A측' : 'B측'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    socket.emit('request-kick', { debateId, userId: user.id, targetId: actionTarget.userId, targetNickname: actionTarget.nickname });
                    setActionTarget(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 active:scale-[0.98] transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <line x1="17" y1="11" x2="22" y2="11"/>
                  </svg>
                  <span className="text-red-400 text-[13px] font-black">강퇴 투표</span>
                </button>
                <button
                  disabled={!!reportedUsers[actionTarget.userId]}
                  onClick={async () => {
                    if (reportedUsers[actionTarget.userId]) return;
                    const targetUserId = actionTarget.userId;
                    setReportLoading(true);
                    setActionTarget(null);
                    setReportedUsers(prev => ({ ...prev, [targetUserId]: true }));
                    try {
                      const targetMsgs = messages.filter(m => m.user_id === targetUserId && m.type !== 'system' && m.type !== 'vote').map(m => m.content).join('\n');
                      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/chat/${debateId}/report`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reporterId: user.id, targetId: targetUserId, messages: targetMsgs }),
                      });
                      const result = await res.json();
                      setReportResult(result);
                    } catch {
                      setReportResult({ safe: false, reason: '신고 처리 중 오류가 발생했습니다.' });
                    } finally {
                      setReportLoading(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border active:scale-[0.98] transition-all ${
                    reportedUsers[actionTarget.userId]
                      ? 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed'
                      : 'bg-amber-500/10 border-amber-500/20'
                  }`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={reportedUsers[actionTarget.userId] ? '#666' : '#f59e0b'} strokeWidth="2" strokeLinecap="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span className={`text-[13px] font-black ${reportedUsers[actionTarget.userId] ? 'text-white/30' : 'text-amber-400'}`}>
                    {reportedUsers[actionTarget.userId] ? '이미 신고됨' : '신고 (AI 분석)'}
                  </span>
                </button>
              </div>
              <button onClick={() => setActionTarget(null)}
                className="w-full mt-3 py-3 rounded-xl text-white/30 text-[13px] font-bold bg-white/5 active:scale-[0.98] transition-all">
                닫기
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ━━━━━ 신고 로딩/결과 오버레이 ━━━━━ */}
      <AnimatePresence>
        {(reportLoading || reportResult) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 z-[62] flex items-center justify-center px-8"
            onClick={() => { if (reportResult) setReportResult(null); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="w-full max-w-[300px] bg-[#1a2744] rounded-2xl border border-white/10 p-6 flex flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}>
              {reportLoading ? (
                <>
                  <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-white/60 text-[13px] font-bold">AI가 채팅 내용을 분석하고 있습니다...</p>
                </>
              ) : reportResult && (
                <>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${reportResult.flagged ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                    {reportResult.flagged ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    )}
                  </div>
                  <p className={`text-[15px] font-black ${reportResult.flagged ? 'text-red-400' : 'text-emerald-400'}`}>
                    {reportResult.flagged ? '부적절한 내용 감지' : '문제 없음'}
                  </p>
                  {reportResult.severity && reportResult.severity !== 'none' && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      reportResult.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                      reportResult.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      위험도: {reportResult.severity === 'high' ? '높음' : reportResult.severity === 'medium' ? '중간' : '낮음'}
                    </span>
                  )}
                  {reportResult.categories?.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {reportResult.categories.map((cat, i) => (
                        <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-white/50">{cat}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-white/40 text-[12px] text-center leading-relaxed">{reportResult.reason}</p>
                  <button onClick={() => setReportResult(null)}
                    className="mt-2 w-full py-2.5 rounded-xl bg-white/10 text-white/50 text-[12px] font-bold active:scale-95 transition-all">
                    확인
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━ 강퇴 투표 (sticky) ━━━━━ */}
      <AnimatePresence>
        {kickRequest && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="shrink-0 px-4 py-3 bg-[#0f1829] border-t border-red-500/20">
            <div className="w-full max-w-[320px] mx-auto bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 flex flex-col items-center gap-2">
              <span className="text-[11px] text-red-400 font-black">
                강퇴 투표: {kickRequest.targetNickname}
              </span>
              <span className="text-[10px] text-white/30">
                {Object.keys(kickRequest.votes || {}).length}/{kickRequest.requiredCount}명 동의
              </span>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-red-400 rounded-full transition-all"
                  style={{ width: `${(Object.keys(kickRequest.votes || {}).length / kickRequest.requiredCount) * 100}%` }} />
              </div>
              {!mySide ? (
                <span className="text-[10px] text-white/20 font-bold">입장 선택자만 투표 가능</span>
              ) : kickRequest.targetId === user?.id ? (
                <span className="text-[10px] text-red-400/60 font-bold">본인에 대한 강퇴 투표입니다</span>
              ) : !kickRequest.votes?.[user?.id] ? (
                <div className="flex gap-2 mt-1">
                  <button onClick={() => socket.emit('vote-kick', { debateId, userId: user.id, agree: true })}
                    className="px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-black active:scale-90 transition-all">강퇴</button>
                  <button onClick={() => socket.emit('vote-kick', { debateId, userId: user.id, agree: false })}
                    className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/50 text-[11px] font-black active:scale-90 transition-all">반대</button>
                </div>
              ) : (
                <span className="text-[10px] text-red-400/60 font-bold">투표하셨습니다</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 종료 오버레이 */}
      <AnimatePresence>
        {showEndOverlay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[#0f1829]/95 flex flex-col items-center justify-center z-50 gap-4">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}
              className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37] flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2">
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/>
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                </svg>
              </div>
              <p className="text-white text-xl font-black">{isCancelled ? '이 논쟁은 진행이 취소되었습니다' : '논쟁이 종료되었습니다'}</p>
              <p className="text-white/40 text-sm font-bold">{isCancelled ? '잠시 후 실시간 피드로 이동합니다...' : '잠시 후 판결 대기로 이동합니다...'}</p>
              <div className="flex gap-1 mt-2">
                {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
