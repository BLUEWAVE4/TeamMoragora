import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { supabase } from '../../services/supabase';
import { getDebate } from '../../services/api';
import { getAvatarUrl, DEFAULT_AVATAR_ICON } from '../../utils/avatar';
import { motion, AnimatePresence } from 'framer-motion';

// ===== 상수 =====
const MAX_CHARS = 200;
const COOLDOWN_MS = 1000;
const SCROLL_THRESHOLD = 120;

// ===== 타이머 훅 =====
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

// MM:SS 포맷
function formatTime(secs) {
  if (secs == null) return '--:--';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// 메시지 시간 포맷
function formatMsgTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function ChatRoom() {
  const { debateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── 논쟁 데이터 ──
  const [debate, setDebate] = useState(null);
  const [mySide, setMySide] = useState(null); // 'A' | 'B'
  const [myNickname, setMyNickname] = useState('');
  const [myAvatarUrl, setMyAvatarUrl] = useState(null);
//   const [loading, setLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  // ── 메시지 ──
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [msgCount, setMsgCount] = useState(0); // 본인 메시지 수
  const MAX_MSGS = 20; // 1인당 최대 메시지

  // ── 스크롤 ──
  const msgEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showNewMsgBtn, setShowNewMsgBtn] = useState(false);
  const isNearBottom = useRef(true);

  // ── 타이핑 인디케이터 ──
  const [opponentTyping, setOpponentTyping] = useState(false);
  const typingTimeout = useRef(null);
  const presenceChannelRef = useRef(null);

  // ── 채팅 종료 연출 ──
  const [chatEnded, setChatEnded] = useState(false);
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const endTriggered = useRef(false);

  // ── 키보드 높이 ──
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ── 타이머 ──
  const timeLeft = useCountdown(debate?.chat_deadline || debate?.vote_deadline);

  // ===== 논쟁 데이터 로드 =====
  useEffect(() => {
    if (!debateId || !user) return;
    const load = async () => {
      try {
        const data = await getDebate(debateId);
        setDebate(data);
        // 내 사이드 결정
        const side = data.creator_id === user.id ? 'A' : 'B';
        setMySide(side);

        // 내 닉네임 + 아바타
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname, avatar_url, gender')
          .eq('id', user.id)
          .single();
        setMyNickname(profile?.nickname || '익명');
        setMyAvatarUrl(profile?.avatar_url || getAvatarUrl(user.id, profile?.gender));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [debateId, user]);

  // ===== 기존 메시지 로드 =====
  useEffect(() => {
    if (!debateId) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, profiles(nickname, avatar_url, gender)')
        .eq('debate_id', debateId)
        .order('created_at', { ascending: true });
      if (data) {
        setMessages(data);
        // 내 메시지 수 카운팅
        const mine = data.filter(m => m.user_id === user?.id).length;
        setMsgCount(mine);
      }
    };
    fetchMessages();
  }, [debateId, user]);

  // ===== Realtime 메시지 구독 =====
  useEffect(() => {
    if (!debateId) return;
    const channel = supabase
      .channel(`chat:${debateId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `debate_id=eq.${debateId}` },
        async (payload) => {
          const msg = payload.new;
          // 프로필 정보 보완
          const { data: profile } = await supabase
            .from('profiles')
            .select('nickname, avatar_url, gender')
            .eq('id', msg.user_id)
            .single();
          const enriched = { ...msg, profiles: profile };
          setMessages(prev => [...prev, enriched]);

          if (msg.user_id !== user?.id) {
            // 새 메시지 버튼
            if (!isNearBottom.current) setShowNewMsgBtn(true);
          } else {
            setMsgCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [debateId, user]);

  // ===== Presence (타이핑 인디케이터) =====
  useEffect(() => {
    if (!debateId || !user) return;
    const channel = supabase.channel(`presence:${debateId}`, {
      config: { presence: { key: user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const others = Object.keys(state).filter(k => k !== user.id);
        const isTyping = others.some(k => state[k]?.[0]?.typing === true);
        setOpponentTyping(isTyping);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ typing: false });
        }
      });

    presenceChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [debateId, user]);

  // ===== 타이머 0 → 종료 처리 =====
  useEffect(() => {
    if (timeLeft === 0 && !endTriggered.current) {
      endTriggered.current = true;
      setChatEnded(true);
      // 입력창 슬라이드 아웃 후 오버레이
      setTimeout(() => setShowEndOverlay(true), 500);
      // 3초 후 판결 대기 페이지로
      setTimeout(() => navigate(`/debate/${debateId}/judging`), 3500);
    }
  }, [timeLeft, debateId, navigate]);

  // ===== 자동 스크롤 =====
  useEffect(() => {
    if (isNearBottom.current) {
      msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, opponentTyping]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottom.current = dist < SCROLL_THRESHOLD;
    if (isNearBottom.current) setShowNewMsgBtn(false);
  }, []);

  // ===== 모바일 키보드 대응 =====
  useEffect(() => {
    if (!window.visualViewport) return;
    const onResize = () => {
      const diff = window.innerHeight - window.visualViewport.height;
      setKeyboardHeight(diff > 0 ? diff : 0);
    };
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport.removeEventListener('resize', onResize);
  }, []);

  // ===== 타이핑 presence 전송 =====
  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    setMsgError('');

    // 타이핑 상태 broadcast
    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({ typing: true });
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        presenceChannelRef.current?.track({ typing: false });
      }, 1500);
    }
  }, []);

  // ===== 메시지 전송 =====
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || cooldown || chatEnded || !mySide) return;
    if (trimmed.length > MAX_CHARS) return;
    if (msgCount >= MAX_MSGS) {
      setMsgError(`메시지는 최대 ${MAX_MSGS}개까지 보낼 수 있습니다.`);
      return;
    }

    setSending(true);
    setCooldown(true);
    setText('');
    presenceChannelRef.current?.track({ typing: false });

    try {
      const { error } = await supabase.from('chat_messages').insert({
        debate_id: debateId,
        user_id: user.id,
        side: mySide,
        content: trimmed,
      });

      if (error) {
        // 비속어 등 서버 에러
        if (error.message?.includes('inappropriate') || error.code === '23514') {
          setMsgError('부적절한 표현이 감지되었습니다.');
        } else {
          setMsgError('전송에 실패했습니다. 다시 시도해주세요.');
        }
        setText(trimmed); // 복원
      }
    } catch (e) {
      setMsgError('전송에 실패했습니다.');
      setText(trimmed);
    } finally {
      setSending(false);
      setTimeout(() => setCooldown(false), COOLDOWN_MS);
    }
  }, [text, sending, cooldown, chatEnded, mySide, msgCount, debateId, user]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const scrollToBottom = () => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewMsgBtn(false);
  };

  // ===== 로딩 =====
  if (loading) return (
    <div className="fixed inset-0 bg-[#0f1829] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <span className="text-white/40 text-sm font-bold">논쟁 준비 중...</span>
      </div>
    </div>
  );

  const isInputDisabled = chatEnded || timeLeft === 0 || !mySide;
  const isWarningTime = timeLeft != null && timeLeft > 0 && timeLeft <= 60;
  const remainingMsgs = MAX_MSGS - msgCount;

  return (
    <div
      className="flex min-h-screen flex-col bg-[#0f1829]"
      style={{ paddingBottom: keyboardHeight }}
    >
      {/* ━━━━━ 헤더 ━━━━━ */}
      <div className="shrink-0 bg-gradient-to-b from-[#1B2A4A] to-[#0f1829] px-4 pt-10 pb-3 border-b border-white/5">
        {/* 주제 */}
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center mb-1">
          실시간 논쟁
        </p>
        <h1 className="text-white text-[15px] font-black text-center leading-snug line-clamp-2 px-8">
          {debate?.topic || ''}
        </h1>

        {/* A측 vs B측 + 타이머 */}
        <div className="flex items-center justify-between mt-3">
          {/* A측 */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-400 max-w-[90px] truncate">
              {debate?.pro_side || 'A측'}
            </span>
            {mySide === 'A' && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">나</span>
            )}
          </div>

          {/* 타이머 */}
          <div className={`flex flex-col items-center ${isWarningTime ? 'animate-pulse' : ''}`}>
            <span
              className="text-2xl font-black tabular-nums leading-none"
              style={{ color: isWarningTime ? '#ef4444' : '#D4AF37' }}
            >
              {formatTime(timeLeft)}
            </span>
            <span className="text-[9px] text-white/30 mt-0.5">남은 시간</span>
          </div>

          {/* B측 */}
          <div className="flex items-center gap-1.5 flex-row-reverse">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-[11px] font-bold text-red-400 max-w-[90px] truncate text-right">
              {debate?.con_side || 'B측'}
            </span>
            {mySide === 'B' && (
              <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">나</span>
            )}
          </div>
        </div>
      </div>

      {/* ━━━━━ 메시지 영역 ━━━━━ */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ overscrollBehavior: 'contain' }}
      >
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
            const isMe = msg.user_id === user?.id;
            const isA = msg.side === 'A';
            const nickname = msg.profiles?.nickname || '익명';
            const avatar = msg.profiles?.avatar_url || getAvatarUrl(msg.user_id, msg.profiles?.gender) || DEFAULT_AVATAR_ICON;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* 아바타 */}
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                </div>

                <div className={`flex flex-col gap-1 max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* 닉네임 */}
                  <span className={`text-[10px] font-bold px-1 ${isA ? 'text-emerald-400' : 'text-red-400'}`}>
                    {nickname}
                    <span className={`ml-1 text-[9px] ${isA ? 'text-emerald-500/60' : 'text-red-500/60'}`}>
                      {isA ? 'A측' : 'B측'}
                    </span>
                  </span>

                  {/* 버블 */}
                  <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words
                        ${isA
                          ? isMe
                            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 rounded-br-sm'
                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-bl-sm'
                          : isMe
                            ? 'bg-red-500/20 border border-red-500/30 text-red-100 rounded-bl-sm'
                            : 'bg-red-500/10 border border-red-500/20 text-red-200 rounded-br-sm'
                        }`}
                    >
                      {msg.content}
                    </div>
                    {/* 시간 */}
                    <span className="text-[9px] text-white/20 shrink-0 pb-0.5">
                      {formatMsgTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* 타이핑 인디케이터 */}
        <AnimatePresence>
          {opponentTyping && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className={`flex items-end gap-2 ${mySide === 'A' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
              <div className={`px-4 py-3 rounded-2xl border
                ${mySide === 'A'
                  ? 'bg-red-500/10 border-red-500/20 rounded-br-sm'
                  : 'bg-emerald-500/10 border-emerald-500/20 rounded-bl-sm'
                }`}>
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={msgEndRef} />
      </div>

      {/* 새 메시지 버튼 */}
      <AnimatePresence>
        {showNewMsgBtn && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-[#1B2A4A] rounded-full text-[12px] font-black shadow-lg active:scale-95 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            새 메시지
          </motion.button>
        )}
      </AnimatePresence>

      {/* ━━━━━ 입력창 ━━━━━ */}
      <AnimatePresence>
        {!chatEnded && (
          <motion.div
            initial={{ y: 0 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeIn' }}
            className="shrink-0 bg-[#0f1829] border-t border-white/5 px-4 py-3"
            style={{ paddingBottom: `max(12px, env(safe-area-inset-bottom))` }}
          >
            {/* 에러 메시지 */}
            <AnimatePresence>
              {msgError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-400 text-[11px] font-bold mb-2 px-1"
                >
                  ⚠ {msgError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* 남은 메시지 수 */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] text-white/20">
                남은 메시지{' '}
                <span className={`font-bold ${remainingMsgs <= 5 ? 'text-amber-400' : 'text-white/40'}`}>
                  {remainingMsgs}개
                </span>
              </span>
              <span className={`text-[10px] font-bold ${text.length > MAX_CHARS * 0.9 ? 'text-amber-400' : 'text-white/20'}`}>
                {text.length} / {MAX_CHARS}
              </span>
            </div>

            {/* 입력창 */}
            <div className="flex items-end gap-2">
              {/* 내 사이드 인디케이터 */}
              <div className={`w-1 h-9 rounded-full shrink-0 ${mySide === 'A' ? 'bg-emerald-500' : 'bg-red-500'}`} />

              <textarea
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                disabled={isInputDisabled}
                maxLength={MAX_CHARS}
                rows={1}
                placeholder={
                  isInputDisabled
                    ? '논쟁이 종료되었습니다'
                    : `${mySide === 'A' ? 'A측' : 'B측'} 주장을 입력하세요...`
                }
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20 transition-colors leading-relaxed disabled:opacity-40"
                style={{ minHeight: '42px', maxHeight: '100px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                }}
              />

              {/* 전송 버튼 */}
              <button
                onClick={handleSend}
                disabled={isInputDisabled || !text.trim() || cooldown || sending}
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90
                  ${!isInputDisabled && text.trim() && !cooldown
                    ? mySide === 'A'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-red-500 text-white'
                    : 'bg-white/5 text-white/20'
                  }`}
              >
                {sending
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━ 종료 오버레이 ━━━━━ */}
      <AnimatePresence>
        {showEndOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[#0f1829]/95 flex flex-col items-center justify-center z-50 gap-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center gap-4"
            >
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
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}