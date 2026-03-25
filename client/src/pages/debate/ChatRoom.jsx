import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { supabase } from '../../services/supabase';
import { socket } from '../../services/socket';
import { getDebate } from '../../services/api';
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

  const msgEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showNewMsgBtn, setShowNewMsgBtn] = useState(false);
  const isNearBottom = useRef(true);

  const [opponentTypingSide, setOpponentTypingSide] = useState(null);
  const [opponentTyping, setOpponentTyping] = useState(false);
  const typingTimeout = useRef(null);

  const [chatEnded, setChatEnded] = useState(false);
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const endTriggered = useRef(false);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [chatDeadline, setChatDeadline] = useState(null);
  const chatDeadlineRef = useRef(null);
  useEffect(() => { chatDeadlineRef.current = chatDeadline; }, [chatDeadline]);
  const timeLeft = useCountdown(gameStarted ? chatDeadline : null);
  const isWarningTime = timeLeft != null && timeLeft > 0 && timeLeft <= 60;

  const isCreator = debate ? debate.creator_id === user?.id : false;

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
        console.log(data);
        if (data.status === 'chatting') {
          setGameStarted(true);
          if (data.chat_deadline) setChatDeadline(data.chat_deadline);
          if (data.creator_id === user.id) setMySide('A');
          else if (data.opponent_id === user.id) setMySide('B');
        } else if (data.status === 'judging') {
          navigate(`/debate/${debateId}/judging`);
          return;
        } else {
          // waiting 상태 — sessionStorage에 이미 시작한 기록이 있으면 복원
          const savedSession = sessionStorage.getItem(`chat_session_${debateId}`);
          if (savedSession) {
            const { side, deadline } = JSON.parse(savedSession);
            setGameStarted(true);
            if (side) setMySide(side); // null이면 설정 안 함 (관전 유지)
            if (deadline) setChatDeadline(deadline);
          }
        }
        const { data: profile } = await supabase
          .from('profiles').select('nickname, avatar_url, gender').eq('id', user.id).single();
        setMyNickname(profile?.nickname || '익명');
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
  useEffect(() => {
    if (!debateId || !user || !myNickname) return;
    socket.emit('join-presence', { debateId, userId: user.id, nickname: myNickname, side: mySide, ready: false });
    socket.on('presence-sync', (slots) => {
      if (slots && typeof slots === 'object') {
        setParticipants(prev => {
          const mergeWithMe = (serverList, side) => {
            const list = Array.isArray(serverList) ? serverList : [];
            // 서버 리스트에 내가 없으면 로컬 prev에서 나를 찾아서 유지
            const hasMe = list.some(p => p.userId === user?.id);
            if (!hasMe) {
              const meInPrev = (Array.isArray(prev[side]) ? prev[side] : []).find(p => p.userId === user?.id);
              if (meInPrev) return [...list, meInPrev];
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
    socket.on('opponent-typing', ({ typing, side }) => {
    setOpponentTyping(typing);
    if (side) setOpponentTypingSide(side);
    if (typing) { clearTimeout(window._typingTimeout); window._typingTimeout = setTimeout(() => setOpponentTyping(false), 3000); }
  });
    socket.on('game-start', ({ chat_deadline }) => {
      setGameStarted(true);
      if (chat_deadline) setChatDeadline(chat_deadline);
      sessionStorage.setItem(`chat_session_${debateId}`, JSON.stringify({ side: mySide || null, deadline: chat_deadline }));
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
  setFilterError(reason || '부적절한 표현이 감지되었습니다.');
  setTimeout(() => setFilterError(''), 3000);
});

socket.on('opponent-left', () => {
  setOpponentLeft(true);
});

socket.on('opponent-returned', () => {
  setOpponentLeft(false);
});

socket.on('chat-auto-ended', () => {
  sessionStorage.removeItem(`chat_session_${debateId}`);
  if (endTriggered.current) return;
  endTriggered.current = true;
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
      socket.off('chat-auto-ended');
    };
  }, [debateId, user, myNickname, mySide]);

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

  socket.emit('select-side', { debateId, userId: user.id, nickname: myNickname, side: newSide, ready: false });
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

  socket.emit('select-side', { debateId, userId: user.id, nickname: myNickname, side: mySide, ready: newReady });
}, [mySide, myReady, gameStarted, debateId, user, myNickname]);

  // ===== 게임 시작 =====
  const handleStart = async () => {
    if (!isCreator || !allReady()) return;
    const chat_deadline = new Date(Date.now() + DEFAULT_DURATION_MS).toISOString();
    await supabase.from('debates').update({ chat_deadline, status: 'chatting' }).eq('id', debateId);
    socket.emit('start-game', { debateId, chat_deadline });
    setGameStarted(true);
    setChatDeadline(chat_deadline);
    sessionStorage.setItem(`chat_session_${debateId}`, JSON.stringify({ side: mySide, deadline: chat_deadline }));
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
  }, [debateId, user]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || cooldown || chatEnded || !mySide) return;
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
  }, [text, sending, cooldown, chatEnded, mySide, msgCount, debateId, user, myNickname]);

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
    <div className="flex h-screen overflow-hidden flex-col bg-[#0f1829]" style={{ paddingBottom: keyboardHeight }}>

      {/* ━━━━━ 대기 오버레이 (3v3 준비방) ━━━━━ */}
      {!loading && !gameStarted && (
        <div className="absolute inset-0 z-30 overflow-y-auto" style={{ backgroundColor: 'rgba(15,24,41,0.98)' }}>
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
                      <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${borderColor} ${bgColor} ${!p ? 'border-dashed' : ''}`}>
                        {p ? (
                          <>
                            <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-white/10 flex items-center justify-center">
                              <img src={getAvatarUrl(p.userId) || DEFAULT_AVATAR_ICON} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className={`text-[11px] font-bold truncate flex-1 ${isMe ? (isA ? 'text-emerald-300' : 'text-red-300') : 'text-white/70'}`}>
                              {isMe ? '나' : p.nickname}
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
        </div>
      )}

      {/* ━━━━━ 헤더 ━━━━━ */}
      <div className="shrink-0 sticky top-0 z-20 bg-gradient-to-b from-[#1B2A4A] to-[#0f1829] px-4 pt-10 pb-3 border-b border-white/5">
        {/* 1. 논쟁 제목 + 태그 */}
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center mb-1">실시간 논쟁</p>
        <h1 className="text-white text-[15px] font-black text-center leading-snug line-clamp-2 px-8">{debate?.topic || ''}</h1>
        <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
          {debate?.category && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/8 text-white/30 font-bold">{debate.category}</span>}
          {debate?.purpose && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/8 text-white/30 font-bold">{debate.purpose}</span>}
          {debate?.lens && debate.lens !== '미선택' && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37]/70 font-bold">{debate.lens}</span>}
        </div>

        {/* A/B + 타이머 + 시간 버튼 */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-col items-start gap-0.5">
            <span className={`text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold self-start ${mySide === 'A' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>나</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-400 max-w-[75px] truncate">{debate?.pro_side || 'A측'}</span>
            </div>
          </div>

          {/* 2. 타이머 + 스킵/추가 버튼 */}
          <div className="flex flex-col items-center gap-1">
            <span className={`text-2xl font-black tabular-nums leading-none ${isWarningTime ? 'animate-pulse' : ''}`}
              style={{ color: isWarningTime ? '#ef4444' : '#D4AF37' }}>
              {formatTime(timeLeft)}
            </span>
            <span className="text-[9px] text-white/30">남은 시간</span>
            {gameStarted && (
              <div className="flex gap-1 mt-0.5">
                <button onClick={handleSkipTime} disabled={!!timeChangeRequest || !mySide}
                  className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px] font-bold active:scale-90 transition-all disabled:opacity-30">
                  스킵
                </button>
                <button onClick={handleExtendTime} disabled={!!timeChangeRequest || !mySide}
                  className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold active:scale-90 transition-all disabled:opacity-30">
                  +5분
                </button>
              </div>
            )}
          </div>

            <div className="flex flex-col items-end gap-0.5">
            <span className={`text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold self-end ${mySide === 'B' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>나</span>
            <div className="flex items-center gap-1.5 flex-row-reverse">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[11px] font-bold text-red-400 max-w-[75px] truncate text-right">{debate?.con_side || 'B측'}</span>
            </div>
          </div>
        </div>
      </div>
      {/* ━━━━━ 상대방 이탈 배너 ━━━━━ */}
      <AnimatePresence>
        {opponentLeft && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="shrink-0 bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2">
            <span className="text-amber-400 text-[11px] font-black">[알림] 상대방이 자리를 비웠습니다</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━ 메시지 영역 ━━━━━ */}
      <div ref={scrollContainerRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ overscrollBehavior: 'contain' }}>

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p className="text-white/40 text-sm font-bold">논쟁을 시작해보세요</p>
          </div>
        )}

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

            if (msg.type === 'vote') {
              const agreedCount = Object.keys(msg.votes || {}).length;
              const iVoted = msg.votes?.[user?.id];
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center px-2">
                  <div className="w-full max-w-[260px] bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex flex-col items-center gap-2">
                    <span className="text-[11px] text-amber-400 font-black">
                      {msg.voteType === 'skip' ? '시간 스킵 요청' : '5분 추가 요청'}
                    </span>
                    <span className="text-[10px] text-white/30">
                      {agreedCount}/{msg.requiredCount}명 동의
                    </span>
                    {/* 진행 바 */}
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${(agreedCount / msg.requiredCount) * 100}%` }} />
                    </div>
                    {!mySide ? (
                      <span className="text-[10px] text-white/20 font-bold">입장 선택자만 투표 가능</span>
                    ) : !iVoted ? (
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => handleVote(true)} className="px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-black active:scale-90 transition-all">동의</button>
                        <button onClick={() => handleVote(false)} className="px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-black active:scale-90 transition-all">거부</button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-emerald-400/60 font-bold">동의하셨습니다.</span>
                    )}
                  </div>
                </motion.div>
              );
            }

            const isMe = msg.user_id === user?.id;
            const isA = msg.side === 'A';
            const nickname = msg.nickname || '익명';
            const avatar = getAvatarUrl(msg.user_id) || DEFAULT_AVATAR_ICON;
            const isExhausted = exhaustedUsers[msg.user_id];

            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-white/10">
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
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
              className="flex items-end gap-2 flex-row">
              <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
              <div className={`px-4 py-3 rounded-2xl border ${opponentTypingSide === 'A' ? 'bg-emerald-500/10 border-emerald-500/20 rounded-bl-sm' : 'bg-red-500/10 border-red-500/20 rounded-bl-sm'}`}>
                <div className="flex gap-1 items-center h-4">
                  {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={msgEndRef} />
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

            {/* 3. 발언권 소진 메시지 */}
            {!mySide ? (
  // 미참여자 — 관전 안내
  <div className="flex items-center justify-center py-3 rounded-xl bg-white/5 border border-white/10 gap-2">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
    <span className="text-white/30 text-[12px] font-bold">관전 중 — 입장을 선택한 참여자만 채팅할 수 있습니다</span>
  </div>
) : exhaustedUsers[user?.id] ? (
  <div className="flex items-center justify-center py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
    <span className="text-amber-400 text-[12px] font-bold">발언권을 모두 사용했습니다</span>
  </div>
) : (
  <div className="flex items-end gap-2">
    <div className={`w-1 h-9 rounded-full shrink-0 ${mySide === 'A' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <textarea value={text} onChange={handleTextChange} onKeyDown={handleKeyDown}
                  disabled={isInputDisabled} maxLength={MAX_CHARS} rows={1}
                  placeholder={isInputDisabled ? '논쟁이 종료되었습니다' : `${mySide === 'A' ? 'A측' : 'B측'} 주장을 입력하세요...`}
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
              <p className="text-white text-xl font-black">논쟁이 종료되었습니다</p>
              <p className="text-white/40 text-sm font-bold">잠시 후 판결 대기로 이동합니다...</p>
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
