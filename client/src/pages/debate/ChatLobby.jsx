import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { supabase } from '../../services/supabase';
import { getDebate } from '../../services/api';
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

  const presenceChannelRef = useRef(null);
  const isCreator = debate ? debate.creator_id === user?.id : false;
  const bothReady = !!slots.A && !!slots.B;

  useEffect(() => {
    if (!debateId || !user) return;
    const load = async () => {
      try {
        const [debateData, { data: profile }] = await Promise.all([
          getDebate(debateId),
          supabase.from('profiles').select('nickname, avatar_url, gender').eq('id', user.id).single(),
        ]);
        setDebate(debateData);
        setMyProfile(profile);
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
      Object.values(state).forEach((entries) => {
        const p = entries[0];
        if (p?.side === 'A') newSlots.A = p;
        if (p?.side === 'B') newSlots.B = p;
      });
      setSlots(newSlots);
    };

    channel
      .on('presence', { event: 'sync' }, syncSlots)
      .on('presence', { event: 'join' }, syncSlots)
      .on('presence', { event: 'leave' }, syncSlots)
      .on('broadcast', { event: 'game_start' }, () => {
        navigate(`/debate/${debateId}/chat`);
      })
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
        <div className="shrink-0 px-5 pb-4" style={{ paddingTop: 'calc(var(--gnb-h) + 24px)' }}>
          <div className="flex items-center gap-3 mb-5">
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
          <div className="bg-white/[0.04] border border-white/8 rounded-2xl px-5 py-4">
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-2 text-center">오늘의 논제</p>
            <h1 className="text-white text-[18px] font-black text-center leading-snug">
              {debate?.topic || ''}
            </h1>
          </div>
        </div>

        {/* 메인: 입장 선택 */}
        <div className="flex-1 px-5 flex flex-col gap-4 justify-center">
          <p className="text-white/40 text-[13px] font-bold text-center">
            당신의 <span className="text-white font-black">입장</span>을 선택하세요
          </p>

          {/* PRO (A측) */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => selectSide('A')}
            disabled={!!slots.A && slots.A.userId !== user.id}
            className={`relative w-full rounded-2xl overflow-hidden transition-all duration-300 ${
              slots.A && slots.A.userId !== user.id ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className={`absolute inset-0 transition-all duration-300 rounded-2xl ${
              mySide === 'A'
                ? 'bg-gradient-to-r from-emerald-600/40 to-emerald-500/20 border-2 border-emerald-400/60'
                : 'bg-[#0d2419]/80 border-2 border-emerald-900/40'
            }`} />
            <div className="relative px-5 py-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all ${
                mySide === 'A' ? 'bg-emerald-500' : 'bg-emerald-900/60'
              }`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-emerald-400 text-[11px] font-black uppercase tracking-widest mb-1">PRO · 찬성</p>
                <p className="text-white text-[15px] font-bold leading-snug line-clamp-2">{proText}</p>
              </div>
              {slots.A ? (
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-emerald-400">
                    <img src={slots.A.avatarUrl || DEFAULT_AVATAR_ICON} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[9px] text-emerald-400 font-bold truncate max-w-[60px] text-center">
                    {slots.A.userId === user.id ? '나' : slots.A.nickname}
                  </span>
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-emerald-800/60 shrink-0" />
              )}
            </div>
          </motion.button>

          {/* VS */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-white/20 text-[11px] font-black tracking-widest">VS</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* CON (B측) */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => selectSide('B')}
            disabled={!!slots.B && slots.B.userId !== user.id}
            className={`relative w-full rounded-2xl overflow-hidden transition-all duration-300 ${
              slots.B && slots.B.userId !== user.id ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className={`absolute inset-0 transition-all duration-300 rounded-2xl ${
              mySide === 'B'
                ? 'bg-gradient-to-r from-red-600/40 to-red-500/20 border-2 border-red-400/60'
                : 'bg-[#1a0808]/80 border-2 border-red-900/40'
            }`} />
            <div className="relative px-5 py-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all ${
                mySide === 'B' ? 'bg-red-500' : 'bg-red-900/60'
              }`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-red-400 text-[11px] font-black uppercase tracking-widest mb-1">CON · 반대</p>
                <p className="text-white text-[15px] font-bold leading-snug line-clamp-2">{conText}</p>
              </div>
              {slots.B ? (
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-red-400">
                    <img src={slots.B.avatarUrl || DEFAULT_AVATAR_ICON} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[9px] text-red-400 font-bold truncate max-w-[60px] text-center">
                    {slots.B.userId === user.id ? '나' : slots.B.nickname}
                  </span>
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-red-800/60 shrink-0" />
              )}
            </div>
          </motion.button>

          {/* 상태 표시 */}
          <div className="flex items-center justify-center gap-4 mt-2">
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

        {/* 하단 버튼 */}
        <div className="shrink-0 px-5 pb-10">
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
