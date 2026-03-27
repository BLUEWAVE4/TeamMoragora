import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { getDebate, getMyProfile } from '../../services/api';
import { getAvatarUrl, DEFAULT_AVATAR_ICON } from '../../utils/avatar';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatLobby() {
  const { debateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [debate, setDebate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mySide, setMySide] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [slots, setSlots] = useState({ A: null, B: null });

  // ===== 대기실 채팅 =====
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef(null);
  const prevPresenceRef = useRef(new Set());

  const presenceChannelRef = useRef(null);
  const isCreator = debate ? debate.creator_id === user?.id : false;
  const bothReady = !!slots.A && !!slots.B;

  useEffect(() => {
    if (!debateId || !user) return;
    const load = async () => {
      try {
        const [debateData, profile] = await Promise.all([
          getDebate(debateId),
          getMyProfile(),
        ]);
        setDebate(debateData);
        setMyProfile(profile);
        // 이미 시작된 논쟁이면 채팅방으로 바로 이동
        if (['chatting', 'both_joined'].includes(debateData.status)) {
          navigate(`/debate/${debateId}/chat`, { replace: true });
          return;
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [debateId, user]);

  useEffect(() => {
    if (!debateId || !user || !myProfile) return;

    const channel = supabase.channel(`lobby:${debateId}`, {
      config: { presence: { key: user.id } }
    });

    const syncSlots = () => {
      const state = channel.presenceState();
      const newSlots = { A: null, B: null };
      const currentUsers = new Set();

      Object.values(state).forEach((entries) => {
        const p = entries[0];
        if (p?.side === 'A') newSlots.A = p;
        if (p?.side === 'B') newSlots.B = p;
        if (p?.userId) currentUsers.add(p.userId);
      });
      setSlots(newSlots);

      // 입장 알림: 새로 들어온 유저 감지
      currentUsers.forEach((uid) => {
        if (!prevPresenceRef.current.has(uid) && uid !== user.id) {
          const entries = Object.values(state).flat();
          const joined = entries.find((e) => e.userId === uid);
          if (joined) {
            setChatMessages((prev) => [
              ...prev,
              {
                id: `sys-join-${uid}-${Date.now()}`,
                type: 'system',
                text: `${joined.nickname || '익명'}님이 대기실에 입장했습니다.`,
                timestamp: Date.now(),
              },
            ]);
          }
        }
      });
      prevPresenceRef.current = currentUsers;
    };

    // 대기실 채팅 메시지 수신
    const handleLobbyChat = ({ payload }) => {
      setChatMessages((prev) => [...prev, payload]);
    };

    channel
      .on('presence', { event: 'sync' }, syncSlots)
      .on('presence', { event: 'join' }, syncSlots)
      .on('presence', { event: 'leave' }, (payload) => {
        syncSlots();
        const left = payload?.leftPresences?.[0];
        if (left && left.userId !== user.id) {
          setChatMessages((prev) => [
            ...prev,
            {
              id: `sys-leave-${left.userId}-${Date.now()}`,
              type: 'system',
              text: `${left.nickname || '익명'}님이 대기실을 떠났습니다.`,
              timestamp: Date.now(),
            },
          ]);
        }
      })
      .on('broadcast', { event: 'game_start' }, () => {
        navigate(`/debate/${debateId}/chat`);
      })
      .on('broadcast', { event: 'lobby_chat' }, handleLobbyChat)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: user.id,
            nickname: myProfile.nickname || '익명',
            avatarUrl: myProfile.avatar_url || getAvatarUrl(user.id, myProfile.gender),
            isCreator: debate?.creator_id === user.id,
            side: null,
          });
        }
      });

    presenceChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [debateId, user, myProfile, debate, navigate]);

  // 채팅 자동 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const selectSide = useCallback(async (side) => {
    if (!presenceChannelRef.current) return;
    if (side === 'A' && slots.A && slots.A.userId !== user.id) return;
    if (side === 'B' && slots.B && slots.B.userId !== user.id) return;

    const newSide = mySide === side ? null : side;
    setMySide(newSide);

    await presenceChannelRef.current.track({
      userId: user.id,
      nickname: myProfile?.nickname || '익명',
      avatarUrl: myProfile?.avatar_url || getAvatarUrl(user.id, myProfile?.gender),
      isCreator: debate?.creator_id === user.id,
      side: newSide,
    });
  }, [mySide, slots, user, myProfile, debate]);

  // 대기실 채팅 전송
  const sendChat = useCallback(() => {
    const text = chatInput.trim();
    if (!text || !presenceChannelRef.current) return;

    const msg = {
      id: `lobby-${user.id}-${Date.now()}`,
      type: 'chat',
      userId: user.id,
      nickname: myProfile?.nickname || '익명',
      avatarUrl: myProfile?.avatar_url || getAvatarUrl(user.id, myProfile?.gender),
      text,
      timestamp: Date.now(),
    };

    // broadcast로 전송 (서버 저장 없이 실시간 공유)
    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'lobby_chat',
      payload: msg,
    });

    // 로컬에도 즉시 추가
    setChatMessages((prev) => [...prev, msg]);
    setChatInput('');
  }, [chatInput, user, myProfile]);

  const handleStart = async () => {
    if (!isCreator || !bothReady) return;
    await presenceChannelRef.current?.send({
      type: 'broadcast',
      event: 'game_start',
      payload: {},
    });
    navigate(`/debate/${debateId}/chat`);
  };

  if (loading) return (
    <div className="min-h-screen flex justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
      <div className="w-full max-w-[440px] flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <span className="text-white/40 text-sm font-bold">대기실 입장 중...</span>
      </div>
    </div>
  );

  const proText = debate?.pro_side || 'A측 입장';
  const conText = debate?.con_side || 'B측 입장';

  return (
    <div
      className="flex justify-center overflow-hidden"
      style={{ backgroundColor: 'var(--color-primary)' }}
    >
      {/* 배경 글로우 */}
      <div className="absolute pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      </div>

      {/* 440px 제한 컨테이너 */}
      <div className="w-full max-w-[440px] flex flex-col h-full relative z-10">

        {/* 헤더 — GNB 높이(56px) + 추가 여백(24px) */}
        <div className="shrink-0 px-5 pb-3" style={{ paddingTop: 'calc(var(--gnb-h) + 24px)' }}>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center active:scale-90 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div>
              <p className="text-[10px] font-bold text-[#D4AF37]/60 uppercase tracking-widest">실시간 논쟁 대기실</p>
              <p className="text-white/30 text-[11px] mt-0.5">입장을 선택하고 논쟁을 시작하세요</p>
            </div>
          </div>

          {/* 주제 카드 */}
          <div className="bg-white/[0.04] border border-white/8 rounded-2xl px-5 py-3">
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-1.5 text-center">오늘의 논제</p>
            <h1 className="text-white text-[16px] font-black text-center leading-snug">
              {debate?.topic || ''}
            </h1>
          </div>
        </div>

        {/* 메인: 입장 선택 (컴팩트) */}
        <div className="shrink-0 px-5 flex flex-col gap-3">
          <p className="text-white/40 text-[12px] font-bold text-center">
            당신의 <span className="text-white font-black">입장</span>을 선택하세요
          </p>

          <div className="flex gap-3">
            {/* PRO (A측) — 컴팩트 카드 */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => selectSide('A')}
              disabled={!!slots.A && slots.A.userId !== user.id}
              className={`relative flex-1 rounded-xl overflow-hidden transition-all duration-300 ${
                slots.A && slots.A.userId !== user.id ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className={`absolute inset-0 transition-all duration-300 rounded-xl ${
                mySide === 'A'
                  ? 'bg-gradient-to-b from-emerald-600/40 to-emerald-500/20 border-2 border-emerald-400/60'
                  : 'bg-[#0d2419]/80 border-2 border-emerald-900/40'
              }`} />
              <div className="relative px-3 py-3 flex flex-col items-center gap-2">
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">PRO · 찬성</p>
                <p className="text-white text-[13px] font-bold leading-snug line-clamp-2 text-center">{proText}</p>
                {slots.A ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-400">
                      <img src={slots.A.avatarUrl || DEFAULT_AVATAR_ICON} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[9px] text-emerald-400 font-bold truncate max-w-[60px]">
                      {slots.A.userId === user.id ? '나' : slots.A.nickname}
                    </span>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-emerald-800/60" />
                )}
              </div>
            </motion.button>

            {/* VS 구분 */}
            <div className="flex items-center">
              <span className="text-white/20 text-[11px] font-black">VS</span>
            </div>

            {/* CON (B측) — 컴팩트 카드 */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => selectSide('B')}
              disabled={!!slots.B && slots.B.userId !== user.id}
              className={`relative flex-1 rounded-xl overflow-hidden transition-all duration-300 ${
                slots.B && slots.B.userId !== user.id ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className={`absolute inset-0 transition-all duration-300 rounded-xl ${
                mySide === 'B'
                  ? 'bg-gradient-to-b from-red-600/40 to-red-500/20 border-2 border-red-400/60'
                  : 'bg-[#1a0808]/80 border-2 border-red-900/40'
              }`} />
              <div className="relative px-3 py-3 flex flex-col items-center gap-2">
                <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">CON · 반대</p>
                <p className="text-white text-[13px] font-bold leading-snug line-clamp-2 text-center">{conText}</p>
                {slots.B ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-red-400">
                      <img src={slots.B.avatarUrl || DEFAULT_AVATAR_ICON} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[9px] text-red-400 font-bold truncate max-w-[60px]">
                      {slots.B.userId === user.id ? '나' : slots.B.nickname}
                    </span>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-red-800/60" />
                )}
              </div>
            </motion.button>
          </div>

          {/* 상태 표시 */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${slots.A ? 'bg-emerald-400' : 'bg-white/10'}`} />
              <span className="text-[10px] text-white/30">A측 {slots.A ? '준비완료' : '대기중'}</span>
            </div>
            <span className="text-white/10">·</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${slots.B ? 'bg-red-400' : 'bg-white/10'}`} />
              <span className="text-[10px] text-white/30">B측 {slots.B ? '준비완료' : '대기중'}</span>
            </div>
          </div>
        </div>

        {/* ===== 대기실 채팅 영역 ===== */}
        <div className="flex-1 px-5 mt-3 flex flex-col min-h-0">
          <button
            onClick={() => setShowChat((v) => !v)}
            className="flex items-center gap-2 mb-2"
          >
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              대기실 채팅
              {chatMessages.length > 0 && (
                <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-[9px] px-1.5 py-0.5 rounded-full">
                  {chatMessages.length}
                </span>
              )}
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className={`transition-transform ${showChat ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
            <div className="flex-1 h-px bg-white/8" />
          </button>

          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col min-h-0 overflow-hidden"
              >
                {/* 메시지 목록 */}
                <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.03] border border-white/6 p-3 space-y-2 min-h-[120px] max-h-[200px]">
                  {chatMessages.length === 0 && (
                    <p className="text-white/15 text-[11px] text-center py-6">
                      대기 중 자유롭게 대화하세요
                    </p>
                  )}
                  {chatMessages.map((msg) =>
                    msg.type === 'system' ? (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-[10px] text-[#D4AF37]/60 bg-[#D4AF37]/8 px-3 py-1 rounded-full">
                          {msg.text}
                        </span>
                      </div>
                    ) : (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.userId === user.id ? 'flex-row-reverse' : ''}`}
                      >
                        <img
                          src={msg.avatarUrl || DEFAULT_AVATAR_ICON}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                        <div className={`max-w-[70%] ${msg.userId === user.id ? 'text-right' : ''}`}>
                          {msg.userId !== user.id && (
                            <p className="text-[9px] text-white/30 font-bold mb-0.5">{msg.nickname}</p>
                          )}
                          <div
                            className={`inline-block px-3 py-1.5 rounded-xl text-[12px] leading-snug ${
                              msg.userId === user.id
                                ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                                : 'bg-white/8 text-white/70'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* 입력창 */}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && sendChat()}
                    placeholder="메시지를 입력하세요..."
                    maxLength={100}
                    className="flex-1 bg-white/[0.06] border border-white/8 rounded-xl px-4 py-2.5 text-[12px] text-white placeholder-white/20 outline-none focus:border-[#D4AF37]/40 transition-colors"
                  />
                  <button
                    onClick={sendChat}
                    disabled={!chatInput.trim()}
                    className={`px-4 rounded-xl font-bold text-[12px] transition-all active:scale-95 ${
                      chatInput.trim()
                        ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30'
                        : 'bg-white/5 text-white/15 cursor-not-allowed'
                    }`}
                  >
                    전송
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 하단 버튼 */}
        <div className="shrink-0 px-5 pb-10 pt-3">
          <AnimatePresence mode="wait">
            {isCreator ? (
              <motion.button
                key="start"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleStart}
                disabled={!bothReady || !mySide}
                className={`w-full py-4 rounded-2xl font-black text-[15px] uppercase tracking-wider transition-all active:scale-[0.97] ${
                  bothReady && mySide
                    ? 'bg-[#D4AF37] text-[#0a0f1a] shadow-[0_0_30px_rgba(212,175,55,0.4)]'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
              >
                {!mySide ? '입장을 먼저 선택하세요' : !bothReady ? '상대방을 기다리는 중...' : '⚔ 논쟁 시작'}
              </motion.button>
            ) : (
              <motion.div
                key="wait"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center gap-3"
              >
                {bothReady ? (
                  <>
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <span className="text-[#D4AF37] text-[13px] font-bold">방장이 시작을 누를 때까지 대기 중</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    <span className="text-white/30 text-[13px] font-bold">
                      {!mySide ? '입장을 먼저 선택하세요' : '상대방을 기다리는 중...'}
                    </span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {isCreator && (
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/debate/${debateId}/lobby`)}
              className="w-full mt-3 py-3 rounded-xl text-[11px] font-bold text-white/20 flex items-center justify-center gap-2 active:text-white/50 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              대기실 링크 복사
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
