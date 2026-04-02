import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { throttle, debounce } from '../../utils/perf';
import useSocketStore from '../../store/useSocketStore';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { supabase } from '../../services/supabase';
import { socket } from '../../services/socket';
import api, { getDebate, castCitizenVote, getCitizenVoteTally, deleteDebate, getSocraticFeedback, getRubricScore } from '../../services/api';
import { resolveAvatar } from '../../utils/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import MoragoraModal from '../../components/common/MoragoraModal';
import useTypingIndicator from '../../hooks/chat/useTypingIndicator';
import useLobbyChat from '../../hooks/chat/useLobbyChat';
import useCitizenVoting from '../../hooks/chat/useCitizenVoting';
import useCountdown, { formatTime, formatMsgTime } from '../../hooks/useCountdown';

const MAX_CHARS = 200;
const COOLDOWN_MS = 1000;
const SCROLL_THRESHOLD = 120;
const MAX_MSGS = 20;
const DEFAULT_DURATION_MS = 15 * 60 * 1000; // 15분 고정
const EXTEND_MS = 5 * 60 * 1000;            // 5분 추가
const MAX_PER_SIDE = 3;                      // 사이드당 최대 3명

export default function ChatRoom() {
  const { debateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socketConnected = useSocketStore(s => s.connected);

  const [gameStarted, setGameStarted] = useState(false);
  // participants: { A: [{userId, nickname, ready},...], B: [...] }
  const [participants, setParticipants] = useState({ A: [], B: [], citizen: [] });
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
  const { citizenVote, citizenVoteLoading, voteTally, setVoteTally, handleCitizenVote } = useCitizenVoting(debateId, gameStarted);
  const [actionTarget, setActionTarget] = useState(null); // { userId, nickname, side }
  const [kickRequest, setKickRequest] = useState(null); // { targetId, targetNickname, votes, requiredCount }
  const [timeVoteCountdown, setTimeVoteCountdown] = useState(null); // 10초 카운트다운
  const [kickVoteCountdown, setKickVoteCountdown] = useState(null); // 10초 카운트다운
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState(null); // { safe, reason }
  const [sideEmptyVote, setSideEmptyVote] = useState(null); // { emptySide, remainingSide, message }
  const [rubricScores, setRubricScores] = useState({ logic: 0, evidence: 0, persuasion: 0, rebuttal: 0, structure: 0, total: 0 });
  const [rubricDisplay, setRubricDisplay] = useState({ logic: 0, evidence: 0, persuasion: 0, rebuttal: 0, structure: 0, total: 0 });
  const [reportedUsers, setReportedUsers] = useState({}); // { [userId]: true }

  const msgEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const chatInputRef = useRef(null);
  const [showNewMsgBtn, setShowNewMsgBtn] = useState(false);
  const isNearBottom = useRef(true);

  const { opponentTyping, opponentTypingSide, opponentTypingNickname, broadcastTyping, stopTyping } = useTypingIndicator(debateId, user, mySide);
  const pendingTimers = useRef([]);
  const toastTimer = useRef(null);

  const [chatEnded, setChatEnded] = useState(false);
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'info'|'warning' }
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [kickSkipCountdown, setKickSkipCountdown] = useState(null); // { side, seconds }
  const endTriggered = useRef(false);
  const [skipApproved, setSkipApproved] = useState(false);
  const [kickConfirm, setKickConfirm] = useState(null); // { userId, nickname }

  // ===== 대기실 채팅 =====
  const { lobbyMessages, setLobbyMessages, lobbyInput, setLobbyInput, lobbyChatEndRef, sendLobbyMessage } = useLobbyChat(debateId, user);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [chatDeadline, setChatDeadline] = useState(null);
  const chatDeadlineRef = useRef(null);
  useEffect(() => { chatDeadlineRef.current = chatDeadline; }, [chatDeadline]);
  const timeLeft = useCountdown(gameStarted ? chatDeadline : null);
  const isWarningTime = timeLeft != null && timeLeft > 0 && timeLeft <= 60;

  const isCreator = debate ? debate.creator_id === user?.id : false;

  // ===== 방장 이탈 차단 =====
  const shouldBlockRef = useRef(false);
  shouldBlockRef.current = isCreator && !gameStarted && !loading && !chatEnded && debate?.status === 'waiting';
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const pendingNavPath = useRef(null);

  // 탭바 등 내부 navigate 가로채기
  useEffect(() => {
    if (!shouldBlockRef.current) return;
    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;
    const intercept = function (state, title, url) {
      if (shouldBlockRef.current && url && !url.includes(`/debate/${debateId}/chat`)) {
        pendingNavPath.current = url;
        setShowLeaveModal(true);
        return;
      }
      return origPush.apply(this, arguments);
    };
    window.history.pushState = intercept;
    window.history.replaceState = function (state, title, url) {
      if (shouldBlockRef.current && url && !url.includes(`/debate/${debateId}/chat`)) {
        pendingNavPath.current = url;
        setShowLeaveModal(true);
        return;
      }
      return origReplace.apply(this, arguments);
    };
    const handlePop = (e) => {
      if (shouldBlockRef.current) {
        window.history.pushState(null, '', window.location.pathname);
        pendingNavPath.current = 'back';
        setShowLeaveModal(true);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => {
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
      window.removeEventListener('popstate', handlePop);
    };
  }, [debateId, shouldBlockRef.current]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    setToast({ message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  // 추적 가능한 setTimeout — 언마운트 시 일괄 정리
  const safeTimeout = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    pendingTimers.current.push(id);
    return id;
  }, []);

  const allReady = useCallback(() => {
  const aList = Array.isArray(participants.A) ? participants.A : [];
  const bList = Array.isArray(participants.B) ? participants.B : [];
  if (aList.length < 1 || bList.length < 1) return false;
  // 방장은 항상 ready, 나머지는 myReady 또는 서버 ready로 판단
  return [...aList, ...bList].every(p => {
    if (p.userId === debate?.creator_id) return true; // 방장 자동 ready
    if (p.userId === user?.id) return myReady;
    return p.ready;
  });
}, [participants, myReady, user, debate]);

  // ===== 데이터 로드 =====
  useEffect(() => {
    if (!debateId || !user) return;
    const load = async () => {
      try {
        const data = await getDebate(debateId);
        if (!data || data.error) {
          sessionStorage.setItem('roomAlert', '삭제되었거나 존재하지 않는 논쟁입니다.');
          navigate('/debate/lobby');
          return;
        }
        setDebate(data);
        // 참여자 아바타 맵 구성 (기존 맵에 누적, 덮어쓰기 X)
        setAvatarMap(prev => {
          const updated = { ...prev };
          if (data.creator) updated[data.creator_id] = resolveAvatar(data.creator.avatar_url, data.creator_id, data.creator.gender);
          if (data.opponent) updated[data.opponent_id] = resolveAvatar(data.opponent.avatar_url, data.opponent_id, data.opponent.gender);
          return updated;
        });
        // 당사자 side 복원 (게임 진행 중일 때만 강제 복원, 대기실에서는 서버 presence 우선)
        const creatorActualSide = data.creator_side || 'A';
        const opponentActualSide = creatorActualSide === 'A' ? 'B' : 'A';
        if (data.status === 'chatting' || data.status === 'both_joined') {
          // 게임 진행 중에는 DB 기준으로 side 강제 복원
          if (data.creator_id === user.id) setMySide(creatorActualSide);
          else if (data.opponent_id === user.id) setMySide(opponentActualSide);
        } else if (data.status === 'waiting') {
          // 대기실에서는 서버 presence-sync에서 side를 복원하므로
          // DB에 명시적으로 참여자로 등록된 경우에만 side 설정
          if (data.opponent_id === user.id) setMySide(opponentActualSide);
          // 방장은 시민 선택도 가능하므로, 여기서 강제 설정하지 않음
          // → presence-sync 이벤트에서 서버의 실제 side로 복원됨
        }

        if (data.status === 'chatting' || data.status === 'both_joined') {
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
        const myAvt = resolveAvatar(profile?.avatar_url, user.id, profile?.gender);
        setMyAvatarUrl(myAvt);
        setAvatarMap(prev => ({ ...prev, [user.id]: myAvt }));
      } catch (e) {
        console.error(e);
        if (e?.response?.status === 404) {
          sessionStorage.setItem('roomAlert', '삭제되었거나 존재하지 않는 논쟁입니다.');
          navigate('/debate/lobby');
          return;
        }
      } finally { setLoading(false); }
    };
    load();
  }, [debateId, user]);

  // chatting 상태면 gameStarted 강제 보장
  useEffect(() => {
    if (debate?.status === 'chatting' && !gameStarted) {
      setGameStarted(true);
      if (debate.chat_deadline) setChatDeadline(debate.chat_deadline);
    }
  }, [debate?.status, debate?.chat_deadline, gameStarted]);

  // ===== 기존 메시지 로드 =====
  useEffect(() => {
    if (!debateId) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages').select('id, debate_id, user_id, nickname, content, side, created_at').eq('debate_id', debateId).order('created_at', { ascending: true });
      if (data) {
        setMessages(data);
        // 메시지가 있으면 게임이 이미 진행 중 → gameStarted 강제
        if (data.length > 0 && !gameStarted) {
          setGameStarted(true);
        }
        const mine = data.filter(m => m.user_id === user?.id).length;
        setMsgCount(mine);
        const countMap = {};
        data.forEach(m => { countMap[m.user_id] = (countMap[m.user_id] || 0) + 1; });
        const exhausted = {};
        Object.entries(countMap).forEach(([uid, cnt]) => { if (cnt >= MAX_MSGS) exhausted[uid] = true; });
        setExhaustedUsers(exhausted);

        // 메시지 참여자 아바타 일괄 조회
        const userIds = [...new Set(data.map(m => m.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles').select('id, avatar_url, gender').in('id', userIds);
          if (profiles) {
            setAvatarMap(prev => {
              const updated = { ...prev };
              profiles.forEach(p => {
                updated[p.id] = resolveAvatar(p.avatar_url, p.id, p.gender);
              });
              return updated;
            });
          }
        }
      }
    };
    fetchMessages();
  }, [debateId, user]);

  // ===== Socket.io 메시지 =====
  useEffect(() => {
    if (!debateId) return;
    socket.connect();
    socket.emit('join-room', debateId);

    // 재연결 시 room 자동 재참여 (최초 연결 제외)
    let isFirstConnect = true;
    const handleReconnect = () => {
      if (isFirstConnect) { isFirstConnect = false; return; }
      console.log('[Socket] 재연결 — room 재참여');
      socket.emit('join-room', debateId);
      if (user && myNickname) {
        socket.emit('join-presence', {
          debateId,
          userId: user.id,
          nickname: myNickname,
          avatarUrl: myAvatarUrl,
          side: mySideRef.current,
          ready: myReady,
          isReconnect: true,
        });
      }
    };
    socket.on('connect', handleReconnect);

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
      socket.off('connect', handleReconnect);
      socket.off('new-message', handleNewMessage);
      socket.off('user-exhausted', handleExhausted);
      socket.emit('leave-room', debateId);
    };
  }, [debateId, user, myNickname, myAvatarUrl]);

  // ===== Socket.io Presence =====
  // mySide를 ref로 추적 — join-presence는 최초 1회만, side 변경은 select-side로만 처리
  const mySideRef = useRef(mySide);
  useEffect(() => { mySideRef.current = mySide; }, [mySide]);

  useEffect(() => {
    if (!debateId || !user || !myNickname || loading) return;
    socket.emit('join-presence', { debateId, userId: user.id, nickname: myNickname, avatarUrl: myAvatarUrl, side: mySideRef.current, ready: false });
    // side가 없으면 자동으로 시민 등록
    if (!mySideRef.current) {
      socket.emit('join-citizen', { debateId, userId: user.id });
    }
    socket.on('presence-sync', (slots) => {
      if (slots && typeof slots === 'object') {
        // 참여자 아바타 맵 업데이트
        const allParticipants = [...(slots.A || []), ...(slots.B || []), ...(slots.citizen || [])];
        if (allParticipants.length > 0) {
          setAvatarMap(prev => {
            const updated = { ...prev };
            allParticipants.forEach(p => {
              if (p.userId && p.avatarUrl) updated[p.userId] = p.avatarUrl;
            });
            return updated;
          });
        }

        // 서버에서 내 side를 알려주면 mySide 동기화 (재연결/새로고침 복원)
        if (user?.id) {
          const meInA = (slots.A || []).find(p => p.userId === user.id);
          const meInB = (slots.B || []).find(p => p.userId === user.id);
          const meInC = (slots.citizen || []).find(p => p.userId === user.id);
          if (meInA) setMySide('A');
          else if (meInB) setMySide('B');
          else if (meInC) setMySide(null);
        }

        setParticipants(prev => {
          const serverA = Array.isArray(slots.A) ? slots.A : [];
          const serverB = Array.isArray(slots.B) ? slots.B : [];
          const serverC = Array.isArray(slots.citizen) ? slots.citizen : [];
          // 서버에 내가 있으면 서버 데이터 신뢰, 없으면 로컬 optimistic 유지
          const meInServer = [...serverA, ...serverB, ...serverC].some(p => p.userId === user?.id);
          if (meInServer) {
            return { A: serverA, B: serverB, citizen: serverC };
          }
          // 서버에 내가 아직 없으면 로컬 상태의 나를 유지
          const myInPrev = [...(prev.A || []), ...(prev.B || []), ...(prev.citizen || [])].find(p => p.userId === user?.id);
          if (!myInPrev) return { A: serverA, B: serverB, citizen: serverC };
          const removeMe = list => list.filter(p => p.userId !== user?.id);
          const result = { A: removeMe(serverA), B: removeMe(serverB), citizen: removeMe(serverC) };
          if (myInPrev.side === 'A') result.A.push(myInPrev);
          else if (myInPrev.side === 'B') result.B.push(myInPrev);
          else result.citizen.push(myInPrev);
          return result;
        });
      }
    });
    // opponent-typing → useTypingIndicator 훅에서 처리
    socket.on('already-in-room', ({ reason, activeDebateId }) => {
      navigate(`/debate/${activeDebateId}/chat`);
    });
    // citizen-vote-tally → useCitizenVoting 훅에서 처리
    socket.on('room-deleted', ({ reason }) => {
      sessionStorage.setItem('roomAlert', reason || '방장이 논쟁을 삭제하였습니다.');
      navigate('/debate/lobby');
    });
    socket.on('duplicate-login', ({ reason }) => {
      sessionStorage.setItem('roomAlert', reason || '다른 브라우저에서 접속하여 현재 세션이 종료됩니다.');
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
      // DB 업데이트 보장 — 소켓 핸들러의 DB 업데이트 실패 대비
      api.post(`/chat/${debateId}/start`).catch(err => console.error('[game-start] REST fallback failed:', err?.response?.data || err.message));
      // Supabase 직접 업데이트 (최종 폴백)
      supabase.from('debates').update({ status: 'chatting', chat_deadline, chat_started_at: new Date().toISOString() }).eq('id', debateId)
        .then(({ error }) => { if (error) console.error('[game-start] Supabase direct update failed:', error.message); else console.log('[game-start] Supabase direct update OK'); });
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
  if (type === 'skip') setSkipApproved(true);
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
  safeTimeout(() => setFilterError(''), 3000);
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
  safeTimeout(() => setShowEndOverlay(true), 500);
  safeTimeout(() => navigate(`/debate/${debateId}/judging`), 3500);
});
// ===== 채팅 종료/취소 =====
socket.on('chat-ended', () => {
  sessionStorage.removeItem(`chat_session_${debateId}`);
  endTriggered.current = true;
  setChatEnded(true);
  setMessages(prev => [...prev, {
    id: `sys-ended-${Date.now()}`,
    type: 'system',
    content: '논쟁이 종료되었습니다. 판결을 진행합니다.',
    created_at: new Date().toISOString(),
  }]);
  safeTimeout(() => setShowEndOverlay(true), 500);
  safeTimeout(() => navigate(`/debate/${debateId}/judging`), 3500);
});

socket.on('chat-cancelled', () => {
  sessionStorage.removeItem(`chat_session_${debateId}`);
  endTriggered.current = true;
  setChatEnded(true);
  setIsCancelled(true);
  setMessages(prev => [...prev, {
    id: `sys-cancelled-${Date.now()}`,
    type: 'system',
    content: '채팅 내용이 없어 논쟁이 취소되었습니다.',
    created_at: new Date().toISOString(),
  }]);
  safeTimeout(() => setShowEndOverlay(true), 500);
  safeTimeout(() => navigate('/debate/lobby'), 3500);
});

// ===== 강퇴 투표 =====
socket.on('kick-request', ({ targetId, targetNickname, votes, requiredCount }) => {
  setKickRequest({ targetId, targetNickname, votes, requiredCount });
});
socket.on('kick-approved', ({ targetId, targetNickname }) => {
  setKickRequest(null);
  if (targetId === user?.id) {
    // 본인이 강퇴됨 — localStorage에 기록
    const kicked = JSON.parse(localStorage.getItem('kickedDebates') || '[]');
    if (!kicked.includes(debateId)) {
      kicked.push(debateId);
      localStorage.setItem('kickedDebates', JSON.stringify(kicked));
    }
    setMessages(prev => [...prev, { id: `sys-kicked-${Date.now()}`, type: 'system', content: '강퇴 투표로 퇴장되었습니다.', created_at: new Date().toISOString() }]);
    setChatEnded(true);
    sessionStorage.setItem('kickedAlert', '강퇴 투표로 논쟁에서 퇴장되었습니다.');
    safeTimeout(() => navigate('/debate/lobby'), 2000);
  } else {
    setMessages(prev => [...prev, { id: `sys-kicked-${Date.now()}`, type: 'system', content: `${targetNickname}님이 강퇴되었습니다.`, created_at: new Date().toISOString() }]);
  }
});
socket.on('kick-cancelled', ({ reason }) => {
  setKickRequest(null);
  setMessages(prev => [...prev, { id: `sys-kick-cancel-${Date.now()}`, type: 'system', content: reason || '강퇴 투표가 부결되었습니다.', created_at: new Date().toISOString() }]);
});
// 참여자 입장 — 상단 토스트로 표시 (A측 green, B측 red)
socket.on('participant-joined', ({ message, side }) => {
  const toastType = side === 'A' ? 'side-a' : side === 'B' ? 'side-b' : 'citizen';
  showToast(message, toastType);
  setLobbyMessages(prev => [...prev, { id: `lobby-sys-join-${Date.now()}`, type: 'system', text: message, timestamp: Date.now(), side }]);
});
// lobby-chat → useLobbyChat 훅에서 처리
// 강퇴된 유저 재참여 차단
socket.on('kicked-blocked', ({ reason }) => {
  setChatEnded(true);
  setMessages(prev => [...prev, { id: `sys-blocked-${Date.now()}`, type: 'system', content: reason, created_at: new Date().toISOString() }]);
  safeTimeout(() => navigate('/debate/lobby'), 2000);
});
// 한 쪽 전원 이탈 → 반대쪽 투표 요청
socket.on('side-empty-vote', ({ emptySide, remainingSide, message }) => {
  setSideEmptyVote({ emptySide, remainingSide, message });
  setMessages(prev => [...prev, { id: `sys-empty-${Date.now()}`, type: 'system', content: message, created_at: new Date().toISOString() }]);
});
socket.on('side-empty-wait', ({ message }) => {
  setSideEmptyVote(null);
  setMessages(prev => [...prev, { id: `sys-wait-${Date.now()}`, type: 'system', content: message, created_at: new Date().toISOString() }]);
});

// 강퇴 후 빈 사이드 스킵 카운트다운
socket.on('kick-skip-countdown', ({ side, seconds }) => {
  setKickSkipCountdown({ side, seconds });
  setMessages(prev => [...prev, { id: `sys-kick-skip-${Date.now()}`, type: 'system', content: `${side}측 참여자가 없습니다. ${seconds}초 후 논쟁이 종료됩니다.`, created_at: new Date().toISOString() }]);
});

    return () => {
      socket.emit('leave-presence', { debateId, userId: user.id });
      socket.off('presence-sync');
      // opponent-typing → useTypingIndicator 훅에서 cleanup
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
      socket.off('side-empty-vote');
      socket.off('side-empty-wait');
      // lobby-chat → useLobbyChat 훅에서 cleanup
      socket.off('already-in-room');
      socket.off('room-deleted');
      // citizen-vote-tally → useCitizenVoting 훅에서 cleanup
      socket.off('duplicate-login');
      socket.off('countdown-start');
      socket.off('chat-auto-ended');
      socket.off('chat-ended');
      socket.off('chat-cancelled');
      // 모든 pending timer 정리
      clearTimeout(toastTimer.current);
      pendingTimers.current.forEach(id => clearTimeout(id));
      pendingTimers.current = [];
    };
  }, [debateId, user, myNickname, loading]);

  // ===== 투표 카운트다운 타이머 =====
  useEffect(() => {
    if (!timeChangeRequest) { setTimeVoteCountdown(null); return; }
    setTimeVoteCountdown(10);
    const iv = setInterval(() => {
      setTimeVoteCountdown(prev => {
        if (prev === null || prev <= 1) { clearInterval(iv); return null; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [!!timeChangeRequest]);

  useEffect(() => {
    if (!kickRequest) { setKickVoteCountdown(null); return; }
    setKickVoteCountdown(10);
    const iv = setInterval(() => {
      setKickVoteCountdown(prev => {
        if (prev === null || prev <= 1) { clearInterval(iv); return null; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [!!kickRequest]);

  // ===== 사이드 선택 (3명 제한) =====
  const selectSide = useCallback((side) => {
  if (gameStarted || myReady) return;
  const sideList = Array.isArray(participants[side]) ? participants[side] : [];
  if (sideList.length >= MAX_PER_SIDE && !sideList.some(p => p.userId === user.id)) return;
  const newSide = mySide === side ? null : side;
  setMySide(newSide);

  // 로컬 즉시 반영 (옵티미스틱)
  setParticipants(prev => {
    const cleanA = (prev.A || []).filter(p => p.userId !== user.id);
    const cleanB = (prev.B || []).filter(p => p.userId !== user.id);
    const cleanC = (prev.citizen || []).filter(p => p.userId !== user.id);
    if (!newSide) {
      return { A: cleanA, B: cleanB, citizen: [...cleanC, { userId: user.id, avatarUrl: myAvatarUrl, _isCitizen: true, _citizenJoinedAt: Date.now() }] };
    }
    const me = { userId: user.id, nickname: myNickname, avatarUrl: myAvatarUrl, side: newSide, ready: false, joinedAt: Date.now() };
    return { A: newSide === 'A' ? [...cleanA, me] : cleanA, B: newSide === 'B' ? [...cleanB, me] : cleanB, citizen: cleanC };
  });

  // 소켓 1회만 emit (서버에서 시민 처리 포함)
  socket.emit('select-side', { debateId, userId: user.id, nickname: myNickname, avatarUrl: myAvatarUrl, side: newSide, ready: false });
}, [mySide, participants, user, myNickname, myAvatarUrl, gameStarted, myReady, debateId]);

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

  // 시민투표 현황 3분마다 시스템 메시지로 안내
  useEffect(() => {
    if (!gameStarted) return;
    const interval = setInterval(() => {
      setMessages(prev => [...prev, {
        id: `sys-vote-${Date.now()}`,
        type: 'system',
        content: voteTally.total > 0
          ? `현재 ${voteTally.total}명의 시민투표가 진행되었습니다.`
          : '아직 시민투표가 없습니다. 시민 참여를 기다리는 중입니다.',
        created_at: new Date().toISOString(),
      }]);
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [gameStarted, voteTally.total]);

  // 소크라테스 피드백 — 3분마다 내 발언 수집 → 조언 채팅 추가
  const socraticTimerRef = useRef(null);
  useEffect(() => {
    if (!gameStarted || !mySide || !debate?.topic) return;
    clearInterval(socraticTimerRef.current);
    socraticTimerRef.current = setInterval(async () => {
      // 내 메시지만 수집
      const myMessages = messages.filter(m => m.user_id === user?.id && m.content);
      if (myMessages.length === 0) return;
      const combined = myMessages.map(m => m.content).join(' ');
      if (combined.trim().length < 10) return;
      try {
        const result = await getSocraticFeedback({
          topic: debate.topic,
          content: combined,
          round: 1,
          side: mySide,
          proSide: debate.pro_side,
          conSide: debate.con_side,
        });
        if (result?.question) {
          setMessages(prev => [...prev, {
            id: `socrates-${Date.now()}`,
            type: 'socrates',
            content: result.question,
            created_at: new Date().toISOString(),
          }]);
        }
      } catch {}
    }, 3 * 60 * 1000);
    return () => clearInterval(socraticTimerRef.current);
  }, [gameStarted, mySide, debate?.topic, messages.length]);

  // 루브릭 점수 — 메시지 전송 시 호출 (newMsg: 방금 전송한 텍스트)
  const updateRubricScore = useCallback(async (newMsg) => {
    if (!gameStarted || !mySide || !debate?.topic) return;
    const myMsgs = messages.filter(m => m.user_id === user?.id && m.content).map(m => m.content);
    if (newMsg) myMsgs.push(newMsg);
    if (myMsgs.length === 0) return;
    const combined = myMsgs.join(' ');
    if (combined.trim().length < 10) return;
    try {
      const scores = await getRubricScore({
        topic: debate.topic, content: combined, side: mySide,
        proSide: debate.pro_side, conSide: debate.con_side,
      });
      if (scores && typeof scores.total === 'number') setRubricScores(scores);
    } catch {}
  }, [gameStarted, mySide, debate?.topic, messages, user?.id]);

  // 카운트업 애니메이션
  useEffect(() => {
    const keys = ['logic', 'evidence', 'persuasion', 'rebuttal', 'structure', 'total'];
    const targets = { ...rubricScores };
    const current = { ...rubricDisplay };
    const needsAnim = keys.some(k => current[k] !== targets[k]);
    if (!needsAnim) return;
    const duration = 800;
    const startTime = Date.now();
    const startValues = { ...current };
    let rafId;
    const frame = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = {};
      keys.forEach(k => { next[k] = Math.round(startValues[k] + (targets[k] - startValues[k]) * eased); });
      setRubricDisplay(next);
      if (progress < 1) rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [rubricScores]);

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

  // ===== 타이머 종료 (서버 판정 대기 — navigate 하지 않음) =====
  useEffect(() => {
    if (timeLeft === 0 && !endTriggered.current) {
      endTriggered.current = true;
      setChatEnded(true);
      sessionStorage.removeItem(`chat_session_${debateId}`);
      safeTimeout(() => setShowEndOverlay(true), 500);
      // 서버 이벤트(chat-ended / chat-cancelled)가 navigate 결정
      // fallback: 10초 내 서버 응답 없으면 로비로 이동
      const fallback = safeTimeout(() => navigate('/debate/lobby'), 10000);
      const clear = () => clearTimeout(fallback);
      socket.on('chat-ended', clear);
      socket.on('chat-cancelled', clear);
      return () => { clearTimeout(fallback); socket.off('chat-ended', clear); socket.off('chat-cancelled', clear); };
    }
  }, [timeLeft, debateId, navigate]);

  useEffect(() => {
    if (isNearBottom.current) msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, opponentTyping]);

  const handleScroll = useMemo(() => throttle(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottom.current = dist < SCROLL_THRESHOLD;
    if (isNearBottom.current) setShowNewMsgBtn(false);
  }, 100), []);

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
    broadcastTyping();
  }, [broadcastTyping]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || cooldown || chatEnded) return;

    // ===== 명령어 처리 (참여자 + 관전자 모두 가능) =====
    const cmd = trimmed.toLowerCase();
    if (cmd === '/help' || cmd === '/도움') {
      setText('');
      setShowHelpPanel(true);
      safeTimeout(() => setShowHelpPanel(false), 5000);
      return;
    }
    if (cmd === '/스킵' || cmd === '/skip') {
      setText('');
      const currentSide = mySideRef.current;
      if (!currentSide) { setMsgError('참여자만 사용할 수 있습니다.'); safeTimeout(() => setMsgError(''), 2000); return; }
      if (timeChangeRequest) { setMsgError('이미 투표가 진행 중입니다.'); safeTimeout(() => setMsgError(''), 2000); return; }
      handleSkipTime();
      return;
    }
    if (cmd === '/시간추가' || cmd === '/+5') {
      setText('');
      const currentSide = mySideRef.current;
      if (!currentSide) { setMsgError('참여자만 사용할 수 있습니다.'); safeTimeout(() => setMsgError(''), 2000); return; }
      if (timeChangeRequest) { setMsgError('이미 투표가 진행 중입니다.'); safeTimeout(() => setMsgError(''), 2000); return; }
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
    if (!mySide && !mySideRef.current) return;
    if (msgCount >= MAX_MSGS) { setMsgError(`발언권(${MAX_MSGS}개)을 모두 사용했습니다.`); return; }

    setSending(true);
    setCooldown(true);
    setText('');
    stopTyping();

    const newCount = msgCount + 1;
    const activeSide = mySide || mySideRef.current;
    const optimisticMsg = { id: `temp-${Date.now()}`, debate_id: debateId, user_id: user.id, nickname: myNickname, content: trimmed, side: activeSide, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticMsg]);
    setMsgCount(newCount);

    if (newCount >= MAX_MSGS) {
      setExhaustedUsers(prev => ({ ...prev, [user.id]: true }));
      socket.emit('user-exhausted', { debateId, userId: user.id, nickname: myNickname });
    }

    socket.emit('send-message', { debateId, userId: user.id, nickname: myNickname, content: trimmed, side: activeSide });
    setSending(false);
    safeTimeout(() => setCooldown(false), COOLDOWN_MS);
    chatInputRef.current?.focus();
    // 전송 성공 → 루브릭 점수 업데이트 (방금 전송한 텍스트 포함)
    updateRubricScore(trimmed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, sending, cooldown, chatEnded, mySide, msgCount, debateId, user, myNickname, timeChangeRequest, updateRubricScore]);

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
    <div className={`flex overflow-hidden flex-col bg-[#0f1829] ${gameStarted ? 'fixed inset-0 z-[60]' : 'min-h-screen pb-24'}`} style={gameStarted ? { paddingBottom: keyboardHeight } : {}}>

      {/* 소켓 연결 끊김 배너 */}
      <AnimatePresence>
        {!socketConnected && gameStarted && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-500 flex items-center justify-center gap-2 px-4 py-2 z-50"
          >
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-xs font-bold">연결이 끊어졌습니다. 재연결 시도 중...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━ 대기 오버레이 (3v3 준비방) ━━━━━ */}
      {!loading && !gameStarted && debate && debate.status === 'waiting' && (
        <div className="absolute inset-0 z-30 overflow-y-auto" style={{ backgroundColor: '#0f1829' }}>
          {/* 상단 토스트 알림 (대기실) — 레이아웃 영향 없도록 absolute */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className={`absolute top-0 left-0 right-0 z-40 px-4 py-2 flex items-center justify-center gap-2 ${
                  toast.type === 'warning' ? 'bg-amber-500/20 border-b border-amber-500/30'
                  : toast.type === 'side-a' ? 'bg-emerald-500/20 border-b border-emerald-500/30'
                  : toast.type === 'side-b' ? 'bg-red-500/20 border-b border-red-500/30'
                  : toast.type === 'citizen' ? 'bg-[#D4AF37]/20 border-b border-[#D4AF37]/30'
                  : 'bg-emerald-500/20 border-b border-emerald-500/30'
                }`}>
                <span className={`text-[11px] font-black ${
                  toast.type === 'warning' ? 'text-amber-400'
                  : toast.type === 'side-a' ? 'text-emerald-400'
                  : toast.type === 'side-b' ? 'text-red-400'
                  : toast.type === 'citizen' ? 'text-[#D4AF37]'
                  : 'text-emerald-400'
                }`}>
                  {toast.message}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex flex-col items-center gap-5 px-5 pt-6 pb-10">

            {/* 논제 + 태그 */}
            <div className="w-full bg-white/[0.04] border border-white/8 rounded-2xl px-5 py-4 text-center">
              <p className="text-[#D4AF37]/50 text-[10px] font-black uppercase tracking-widest mb-1">논제</p>
              <h2 className="text-white text-[17px] font-black leading-snug">{debate?.topic || ''}</h2>
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                {debate?.purpose && <span onClick={() => showToast(`판결 목적: ${debate.purpose}`, 'info', 2000)} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40 font-bold cursor-pointer active:scale-95 transition-all">{debate.purpose}</span>}
                {debate?.lens && debate.lens !== '미선택' && <span onClick={() => showToast(`판결 기준: ${debate.lens}`, 'info', 2000)} className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold cursor-pointer active:scale-95 transition-all">{debate.lens}</span>}
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
                      <div key={i} className={`flex items-center gap-2 px-3 h-10 rounded-xl border transition-all overflow-visible ${borderColor} ${bgColor} ${!p ? 'border-dashed' : ''}`}>
                        {p ? (
                          <>
                            <div
                              className={`relative w-6 h-6 shrink-0 ${!isMe && mySide ? 'cursor-pointer active:scale-90' : ''}`}
                              onClick={() => { if (!isMe && mySide) setActionTarget({ userId: p.userId, nickname: p.nickname, side }); }}
                            >
                              <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                                <img src={p.avatarUrl || DEFAULT_AVATAR_ICON} alt="" className="w-full h-full object-cover pointer-events-none" />
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

            {/* 시민(관전자) 슬롯 */}
            <div className="w-full flex flex-col gap-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-center text-[#D4AF37]">시민</p>
              {(() => {
                const citizenList = Array.isArray(participants.citizen) ? participants.citizen : [];
                const isMeCitizen = !mySide && citizenList.some(c => c.userId === user?.id);
                const canClickCitizen = mySide && !myReady && !isMeCitizen;
                return (
                  <button
                    disabled={!canClickCitizen && !isMeCitizen}
                    onClick={() => {
                      if (canClickCitizen) {
                        selectSide(mySide); // side 해제 → 자동 시민 등록
                      }
                    }}
                    className={`w-full h-10 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                      isMeCitizen
                        ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10'
                        : canClickCitizen
                          ? 'border-dashed border-[#D4AF37]/30 active:scale-[0.97] cursor-pointer'
                          : 'border-dashed border-[#D4AF37]/30 cursor-default'
                    }`}
                  >
                    {citizenList.map(c => (
                      <div key={c.userId} className="w-6 h-6 rounded-full overflow-hidden border border-[#D4AF37]/40 bg-white/10">
                        <img src={c.avatarUrl || DEFAULT_AVATAR_ICON} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {!isMeCitizen && (
                      <span className={`text-[10px] font-bold ${canClickCitizen ? 'text-[#D4AF37]/50' : 'text-[#D4AF37]/20'}`}>+ 선택</span>
                    )}
                  </button>
                );
              })()}
            </div>

            {/* 준비완료 버튼 (방장 제외) / 시민 안내 */}
            {!isCreator && (() => {
              const citizenList = Array.isArray(participants.citizen) ? participants.citizen : [];
              const isMeCitizen = !mySide && citizenList.some(c => c.userId === user?.id);
              if (isMeCitizen) {
                return (
                  <div className="w-full py-3.5 rounded-2xl border-2 border-[#D4AF37]/20 bg-[#D4AF37]/5 text-center">
                    <span className="text-[11px] text-[#D4AF37]/60 font-bold leading-snug">시민으로 참여합니다 · 투표만 가능</span>
                  </div>
                );
              }
              if (mySide) {
                return (
                  <button onClick={toggleReady}
                    className={`w-full py-3.5 rounded-2xl font-black text-[14px] transition-all active:scale-[0.97] border-2 ${
                      myReady ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300' : 'bg-white/5 border-white/10 text-white/50'
                    }`}>
                    {myReady ? '준비완료' : '준비'}
                  </button>
                );
              }
              return null;
            })()}

            {/* 방장: 게임 시작 버튼 (allReady 시 활성화) */}
            {isCreator && (
              <button onClick={handleStart} disabled={!allReady()}
                className={`w-full py-4 rounded-2xl font-black text-[15px] uppercase tracking-wider transition-all active:scale-[0.97] ${
                  allReady() ? 'bg-[#D4AF37] text-[#0a0f1a] shadow-[0_0_30px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}>
                논쟁 시작
              </button>
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
                        <span className="text-[22px] font-black text-[#D4AF37] leading-none drop-shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                          논쟁이 시작됩니다
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
                    {countdown > 0 ? '' : ''}
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ━━━━━ 헤더 ━━━━━ */}
      <div className="shrink-0 sticky top-0 z-20 bg-gradient-to-b from-[#1B2A4A] to-[#0f1829] px-4 pt-4 pb-3 border-b border-white/5">
        {/* 시민 나가기 버튼 */}
        {isCitizen && (
          <button onClick={() => navigate('/debate/lobby')} className="absolute left-3 top-3 z-30 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        {/* 1. 논쟁 제목 + 태그 */}
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center mb-1">실시간 논쟁</p>
        <h1 className="text-white text-[15px] font-black text-center leading-snug line-clamp-2 px-8">{debate?.topic || ''}</h1>
        <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
          {debate?.purpose && <span onClick={() => showToast(`판결 목적: ${debate.purpose}`, 'info', 2000)} className="text-[10px] px-2 py-0.5 rounded bg-white/8 text-white/30 font-bold cursor-pointer active:scale-95 transition-all">{debate.purpose}</span>}
          {debate?.lens && debate.lens !== '미선택' && <span onClick={() => showToast(`판결 기준: ${debate.lens}`, 'info', 2000)} className="text-[10px] px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37]/70 font-bold cursor-pointer active:scale-95 transition-all">{debate.lens}</span>}
        </div>

        {/* A/B + 타이머 (3등분 레이아웃 — 타이머 항상 정중앙) */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mt-3">
          <div className="flex flex-col items-start gap-0.5 min-w-0">
            <span className="text-[11px] font-bold text-emerald-400 leading-tight break-keep line-clamp-2">{debate?.pro_side || 'A측'}</span>
          </div>

          <div className="flex flex-col items-center gap-1 px-3">
            <span className={`text-2xl font-black tabular-nums leading-none ${isWarningTime ? 'animate-pulse' : ''}`}
              style={{ color: isWarningTime ? '#ef4444' : '#D4AF37' }}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <div className="flex flex-col items-end gap-0.5 min-w-0">
            <span className="text-[11px] font-bold text-red-400 leading-tight break-keep text-right line-clamp-2">{debate?.con_side || 'B측'}</span>
          </div>
        </div>
      </div>

      {/* 시민투표 게이지바 제거 — 3분마다 시스템 메시지로 안내 */}

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
            // 소크라테스 피드백 메시지
            if (msg.type === 'socrates') {
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                  <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 max-w-[85%]">
                    <span className="text-[9px] font-bold text-[#D4AF37] block mb-1">소크라테스 조언</span>
                    <span className="text-[12px] text-white/50 leading-[1.5]">{msg.content}</span>
                  </div>
                </motion.div>
              );
            }

            // 3. 시스템 메시지 (발언권 소진)
            if (msg.type === 'system') {
              const sysColor = msg.side === 'A' ? 'text-emerald-400/60 bg-emerald-400/10'
                : msg.side === 'B' ? 'text-red-400/60 bg-red-400/10'
                : 'text-amber-400/50 bg-amber-400/10';
              return (
                <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                  <span className={`text-[10px] ${sysColor} px-3 py-1 rounded-full`}>{msg.content}</span>
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
                {timeVoteCountdown != null && <span className="ml-1.5 text-amber-400/80">({timeVoteCountdown}초)</span>}
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

      {/* ━━━━━ 한 쪽 전원 이탈 투표 ━━━━━ */}
      <AnimatePresence>
        {sideEmptyVote && mySide === sideEmptyVote.remainingSide && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="shrink-0 bg-amber-500/10 border-t border-amber-500/30 px-4 py-4"
          >
            <p className="text-amber-400 text-[13px] font-bold text-center mb-3">
              {sideEmptyVote.emptySide}측 전원이 이탈했습니다
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { socket.emit('side-empty-decision', { debateId, decision: 'judge' }); setSideEmptyVote(null); }}
                className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-[#1B2A4A] text-[13px] font-black active:scale-95 transition-all"
              >
                판결 진행
              </button>
              <button
                onClick={() => { socket.emit('side-empty-decision', { debateId, decision: 'wait' }); setSideEmptyVote(null); }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/60 text-[13px] font-bold active:scale-95 transition-all"
              >
                복귀 대기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━ 입력창 ━━━━━ */}
      <AnimatePresence>
        {!chatEnded && (
          <motion.div initial={{ y: 0 }} exit={{ y: 100, opacity: 0 }} transition={{ duration: 0.4, ease: 'easeIn' }}
            className="shrink-0 bg-[#0f1829] border-t border-white/5 px-4 py-3"
            style={{ paddingBottom: `max(16px, env(safe-area-inset-bottom))` }}>
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

            {/* 루브릭 점수 바 */}
            {mySide && (
              <div className="flex items-center gap-2 mb-2 px-1 cursor-pointer active:scale-[0.98] transition-transform" onClick={async () => {
                const myMsgs = messages.filter(m => m.user_id === user?.id && m.content);
                if (myMsgs.length === 0) return;
                const combined = myMsgs.map(m => m.content).join(' ');
                if (combined.trim().length < 10) return;
                try {
                  const scores = await getRubricScore({ topic: debate?.topic, content: combined, side: mySide, proSide: debate?.pro_side, conSide: debate?.con_side });
                  if (scores && typeof scores.total === 'number') setRubricScores(scores);
                } catch {}
              }}>
                <span className="text-[9px] font-black text-[#D4AF37] bg-[#D4AF37]/15 px-1.5 py-0.5 rounded shrink-0">Premium</span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[9px] text-white/30">논리<span className="text-white/50 font-bold ml-0.5">{rubricDisplay.logic}</span></span>
                  <span className="text-[9px] text-white/30">근거<span className="text-white/50 font-bold ml-0.5">{rubricDisplay.evidence}</span></span>
                  <span className="text-[9px] text-white/30">설득<span className="text-white/50 font-bold ml-0.5">{rubricDisplay.persuasion}</span></span>
                  <span className="text-[9px] text-white/30">반박<span className="text-white/50 font-bold ml-0.5">{rubricDisplay.rebuttal}</span></span>
                  <span className="text-[9px] text-white/30">구성<span className="text-white/50 font-bold ml-0.5">{rubricDisplay.structure}</span></span>
                </div>
                <span className="text-[11px] font-black text-[#D4AF37] tabular-nums shrink-0">{rubricDisplay.total}<span className="text-[9px] text-white/20">/100</span></span>
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
    <div className={`w-1 h-8 rounded-full shrink-0 self-center ${mySide === 'A' ? 'bg-emerald-500' : mySide === 'B' ? 'bg-red-500' : 'bg-white/20'}`} />
                <textarea ref={chatInputRef} value={text} onChange={handleTextChange} onKeyDown={handleKeyDown}
                  disabled={isInputDisabled} rows={1}
                  placeholder={chatEnded || timeLeft === 0 ? '논쟁이 종료되었습니다' : !mySide ? '입장을 선택해주세요' : `${mySide === 'A' ? 'A측' : 'B측'} 주장 입력 (${remainingMsgs}/20)`}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20 transition-colors leading-relaxed disabled:opacity-40"
                  style={{ minHeight: '42px', maxHeight: '100px' }}
                  onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
                />
                <button onClick={handleSend} disabled={isInputDisabled || !text.trim() || cooldown || sending}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 self-center ${
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
              className="fixed inset-0 bg-black/40 z-[60]" />
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-0 left-0 right-0 z-[61] bg-[#1a2744] rounded-t-2xl border-t border-white/10 p-5 max-w-md mx-auto">
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
                {/* 강퇴: 1:1이면 생성자만, 다인원이면 누구나 */}
                {(() => {
                  const totalP = (participants.A?.length || 0) + (participants.B?.length || 0);
                  const isOneOnOne = totalP <= 2;
                  const canKick = isOneOnOne ? (user?.id === debate?.creator_id) : true;
                  if (!canKick) return null;
                  return (
                    <button
                      onClick={() => {
                        if (isOneOnOne) {
                          setKickConfirm({ userId: actionTarget.userId, nickname: actionTarget.nickname });
                          setActionTarget(null);
                        } else {
                          socket.emit('request-kick', { debateId, userId: user.id, targetId: actionTarget.userId, targetNickname: actionTarget.nickname });
                          setActionTarget(null);
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 active:scale-[0.98] transition-all"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <line x1="17" y1="11" x2="22" y2="11"/>
                      </svg>
                      <span className="text-red-400 text-[13px] font-black">강퇴</span>
                    </button>
                  );
                })()}
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
            className="fixed inset-0 bg-black/60 z-[62] flex items-center justify-center px-8"
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
                {kickVoteCountdown != null && <span className="ml-1.5 text-red-400/80">({kickVoteCountdown}초)</span>}
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

      {/* ━━━━━ 방장 이탈 확인 모달 ━━━━━ */}
      <MoragoraModal
        isOpen={showLeaveModal}
        onClose={() => { setShowLeaveModal(false); pendingNavPath.current = null; }}
        title="페이지를 떠나시겠습니까?"
        description="이동 시 생성된 논쟁이 삭제됩니다."
        type="danger"
        confirmText="삭제"
        cancelText="아니오"
        onConfirm={async () => {
          shouldBlockRef.current = false;
          try {
            await deleteDebate(debateId);
            socket.emit('room-deleted', { debateId });
          } catch {}
          setShowLeaveModal(false);
          if (pendingNavPath.current === 'back') {
            navigate(-1);
          } else if (pendingNavPath.current) {
            navigate(pendingNavPath.current);
          } else {
            navigate('/');
          }
        }}
      />
      <MoragoraModal
        isOpen={!!kickConfirm}
        onClose={() => setKickConfirm(null)}
        title={`${kickConfirm?.nickname}님을 강퇴하시겠습니까?`}
        description="1:1 논쟁에서 강퇴 시 논쟁이 무효 처리됩니다."
        type="danger"
        confirmText="강퇴"
        cancelText="취소"
        onConfirm={() => {
          socket.emit('request-kick', { debateId, userId: user.id, targetId: kickConfirm.userId, targetNickname: kickConfirm.nickname });
          setKickConfirm(null);
        }}
      />
    </div>
  );
}
