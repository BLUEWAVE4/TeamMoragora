import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import CategoryFilter from '../../components/home/CategoryFilter';
import { getAllPublicDebates, incrementDebateView } from '../../services/api';
import { supabase } from '../../services/supabase';
import { getAvatarUrl, DEFAULT_AVATAR_ICON } from '../../utils/avatar';
import { useAuth } from '../../store/AuthContext';
import MoragoraModal from '../../components/common/MoragoraModal';

// ===== 실시간 경과/남은 시간 표시 =====
function LiveTimer({ createdAt, chatDeadline, status }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n) => String(Math.floor(n)).padStart(2, '0');

  if (status === 'chatting' && chatDeadline) {
    const remaining = Math.max(0, new Date(chatDeadline).getTime() - now);
    const min = (remaining / 60000) % 60;
    const sec = (remaining / 1000) % 60;
    const isUrgent = remaining <= 60000;
    return (
      <div className="flex flex-col items-center">
        <span className={`text-[18px] font-black tabular-nums leading-none ${isUrgent ? 'text-red-500 animate-pulse' : 'text-[#D4AF37]'}`}>
          {remaining <= 0 ? '종료' : `${pad(min)}:${pad(sec)}`}
        </span>
        <span className="text-[9px] text-gray-400 font-bold mt-0.5">남은 시간</span>
      </div>
    );
  }

  const elapsed = Math.max(0, now - new Date(createdAt).getTime());
  const min = (elapsed / 60000) % 60;
  const sec = (elapsed / 1000) % 60;
  const hr = elapsed / 3600000;
  if (hr >= 1) return <span className="text-gray-400 font-bold text-[11px]">{Math.floor(hr)}시간 대기</span>;
  return (
    <span className="text-gray-400 font-bold text-[11px] tabular-nums">
      {pad(min)}:{pad(sec)} 대기
    </span>
  );
}

// ===== 참여자 슬롯 =====
function ParticipantSlot({ name, color, isEmpty }) {
  const colors = {
    emerald: "bg-[#F9FBF9] text-emerald-600 border-emerald-100 shadow-sm",
    red: "bg-[#FDF9F9] text-red-500 border-red-100 shadow-sm",
    empty: "bg-gray-100/30 text-gray-300 border-dashed border-gray-100 opacity-40"
  };
  return (
    <div className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${isEmpty ? colors.empty : colors[color]}`}>
      <span className={`w-1 h-1 rounded-full ${isEmpty ? 'bg-gray-200' : (color === 'emerald' ? 'bg-emerald-500' : 'bg-red-400')}`} />
      <span className="truncate flex-1">{isEmpty ? '빈 자리' : name}</span>
    </div>
  );
}

// ===== 채팅 진행 타이머 (ChatRoom 헤더 스타일) =====
const CHAT_TOTAL_MS = 15 * 60 * 1000; // 15분

function ChatProgressBar({ chatDeadline, proSide, conSide }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const deadlineMs = new Date(chatDeadline).getTime();
  const startMs = deadlineMs - CHAT_TOTAL_MS;
  const elapsed = Math.max(0, now - startMs);
  const remaining = Math.max(0, deadlineMs - now);
  const progress = Math.min(1, elapsed / CHAT_TOTAL_MS);

  const pad = (n) => String(Math.floor(n)).padStart(2, '0');
  const min = (remaining / 60000) % 60;
  const sec = (remaining / 1000) % 60;
  const isUrgent = remaining <= 60000;

  return (
    <div className="mt-3 pt-3 border-t border-gray-50">
      {/* A측 — 타이머 — B측 (ChatRoom 헤더와 동일 레이아웃) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-[11px] font-bold text-emerald-600 truncate">{proSide || 'A측'}</span>
        </div>

        <div className="flex flex-col items-center gap-0.5 px-3 shrink-0">
          <span className={`text-[20px] font-black tabular-nums leading-none ${isUrgent ? 'text-red-500 animate-pulse' : 'text-[#1B2A4A]'}`}>
            {remaining <= 0 ? '종료' : `${pad(min)}:${pad(sec)}`}
          </span>
          <span className="text-[9px] text-gray-400 font-bold">남은 시간</span>
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className="text-[11px] font-bold text-red-500 truncate text-right">{conSide || 'B측'}</span>
          <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${isUrgent ? 'bg-red-400' : 'bg-[#D4AF37]'}`}
          style={{ width: `${(1 - progress) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ===== 카드 =====
function LobbyDebateCard({ room, onCardClick, isKicked, liveSlots }) {
  const creatorAvatarUrl = room.creator?.avatar_url || getAvatarUrl(room.creator_id, room.creator?.gender) || DEFAULT_AVATAR_ICON;

  // 실시간 참여자가 있으면 소켓 데이터 사용, 없으면 DB 폴백
  const liveA = liveSlots?.A || [];
  const liveB = liveSlots?.B || [];
  const hasLive = liveA.length > 0 || liveB.length > 0;

  const creatorName = room.creator?.nickname || '방장';
  const opponentName = room.opponent?.nickname || null;
  const currentTotal = hasLive ? (liveA.length + liveB.length) : [creatorName, opponentName].filter(Boolean).length;

  // DB 폴백용 side 배치
  const creatorSide = room.creator_side || 'A';
  const sideAName = creatorSide === 'A' ? creatorName : opponentName;
  const sideBName = creatorSide === 'A' ? opponentName : creatorName;

  const statusConfig = {
    waiting: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', label: '대기 중' },
    chatting: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400', label: '토론 중' },
    judging: { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500', label: '판결 중' },
  };
  const sc = statusConfig[room.status] || statusConfig.waiting;

  return (
    <div onClick={() => !isKicked && onCardClick(room)} className={`rounded-2xl p-5 shadow-sm border transition-all mb-3 ${
      isKicked
        ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
        : 'bg-white border-gray-100 cursor-pointer active:scale-[0.99]'
    }`}>
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-200/50">
            <img src={creatorAvatarUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-[#1B2A4A] text-[14px]">{creatorName}</span>
            <span className="text-[10px] text-gray-400 font-bold">{room.creator?.tier || '시민'}</span>
          </div>
        </div>
        <LiveTimer createdAt={room.created_at} chatDeadline={room.chat_deadline} status={room.status} />
      </div>

      <h3 className="text-[17px] font-black text-[#1B2A4A] mb-3 leading-snug break-keep">{room.topic}</h3>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-[11px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-1 rounded-full">{room.category}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 flex flex-col gap-1 p-2.5 rounded-xl bg-[#F9FBF9]/70 border border-emerald-50">
          <div className="text-[9px] font-black text-emerald-700/40 text-center mb-0.5">A측</div>
          {[0, 1, 2].map(i => {
            const p = hasLive ? liveA[i] : (i === 0 ? { nickname: sideAName } : null);
            return <ParticipantSlot key={`a-${i}`} name={p?.nickname || null} color="emerald" isEmpty={!p?.nickname} />;
          })}
        </div>
        <span className="text-[10px] font-black text-gray-200">VS</span>
        <div className="flex-1 flex flex-col gap-1 p-2.5 rounded-xl bg-[#FDF9F9]/70 border border-red-50">
          <div className="text-[9px] font-black text-red-600/40 text-center mb-0.5">B측</div>
          {[0, 1, 2].map(i => {
            const p = hasLive ? liveB[i] : (i === 0 ? { nickname: sideBName } : null);
            return <ParticipantSlot key={`b-${i}`} name={p?.nickname || null} color="red" isEmpty={!p?.nickname} />;
          })}
        </div>
      </div>

      {room.status === 'chatting' && room.chat_deadline && (
        <ChatProgressBar chatDeadline={room.chat_deadline} proSide={room.pro_side} conSide={room.con_side} />
      )}

      {isKicked && (
        <div className="mt-3 flex items-center gap-1.5 justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span className="text-[11px] font-bold text-red-400">강퇴된 논쟁 — 재참여 불가</span>
        </div>
      )}
    </div>
  );
}

// ===== 메인 =====
export default function DebateLobbyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('전체');
  const [sortBy, setSortBy] = useState('최신순');
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [visibleCount, setVisibleCount] = useState(10);
  const observerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liveParticipants, setLiveParticipants] = useState({}); // { debateId: { A: [...], B: [...] } }

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [res, partRes] = await Promise.all([
        getAllPublicDebates(),
        fetch(`${import.meta.env.DEV ? 'http://localhost:5000' : 'https://teammoragora.onrender.com'}/api/rooms/participants`).then(r => r.json()).catch(() => ({})),
      ]);
      setLiveParticipants(partRes || {});
      const rawRooms = res?.data || res || [];
      const now = Date.now();
      const STALE_MS = 30 * 60 * 1000;
      const lobbyRooms = rawRooms.filter(r => {
        const status = String(r.status).toLowerCase();
        if (status === 'chatting') return true;
        if (status === 'waiting') {
          if ((now - new Date(r.created_at).getTime()) < STALE_MS) return true;
          // 30분 초과해도 참여자가 있으면 유지
          const live = partRes?.[r.id];
          const hasParticipants = live && ((live.A?.length || 0) + (live.B?.length || 0) + (live.citizen?.length || 0)) > 0;
          return hasParticipants;
        }
        return false;
      });
      setRooms(lobbyRooms);
    } catch (err) { console.error(err); } finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 5초 폴링
  useEffect(() => {
    const timer = setInterval(() => loadData(true), 5000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('lobby_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debates', filter: 'mode=eq.chat' }, () => loadData(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const lastElementRef = useCallback((node) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount(prev => prev + 10);
    });
    if (node) observerRef.current.observe(node);
  }, [loading]);

  useEffect(() => { setVisibleCount(10); }, [filter, searchQuery]);

  // 인기 실시간 논쟁: 참여자(관전자 포함) 가장 많은 chatting 방 1개
  const hotRoom = rooms
    .filter(r => r.status === 'chatting')
    .map(r => {
      const live = liveParticipants[r.id];
      const liveCount = live ? (live.A?.length || 0) + (live.B?.length || 0) : 0;
      return { ...r, participantCount: liveCount };
    })
    .sort((a, b) => b.participantCount - a.participantCount)[0] || null;

  const kickedDebates = JSON.parse(localStorage.getItem('kickedDebates') || '[]');

  const handleCardClick = async (room) => {
    if (!room?.id) return;
    if (!user) { setLoginModalOpen(true); return; }
    if (kickedDebates.includes(room.id)) return; // 강퇴 방 클릭 차단
    try { await incrementDebateView(room.id); } catch (e) {}
    navigate(`/debate/${room.id}/chat`);
  };

  const filteredRooms = rooms
    .filter(r => (filter === '전체' || r.category === filter) && (!searchQuery || r.topic.toLowerCase().includes(searchQuery)))
    .sort((a, b) => {
      if (a.status === 'chatting' && b.status !== 'chatting') return -1;
      if (b.status === 'chatting' && a.status !== 'chatting') return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const processedRooms = filteredRooms.slice(0, visibleCount);

  if (loading) return (
    <div className="min-h-screen bg-[#F3F1EC] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1B2A4A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F1EC] pb-32 pt-4">
      {/* 인기 실시간 논쟁 (참여자 가장 많은 1개) */}
      {hotRoom && (
        <section className="px-5 mb-6">
          <div
            onClick={() => !kickedDebates.includes(hotRoom.id) && handleCardClick(hotRoom)}
            className="bg-gradient-to-br from-[#1B2A4A] to-[#0f1829] rounded-2xl overflow-hidden shadow-xl cursor-pointer active:scale-[0.99] transition-all"
          >
            {/* 상단 배너 */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[11px] text-[#D4AF37] font-black uppercase tracking-widest">HOT 실시간 논쟁</span>
                </div>
                <LiveTimer createdAt={hotRoom.created_at} chatDeadline={hotRoom.chat_deadline} status="chatting" />
              </div>
              <h2 className="text-white text-[19px] font-black leading-snug break-keep mb-2">
                {hotRoom.topic}
              </h2>
              <div className="flex items-center gap-2">
                {hotRoom.category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 font-bold">{hotRoom.category}</span>}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-bold">
                  {hotRoom.participantCount}명 참여 중
                </span>
              </div>
            </div>

            {/* A vs B */}
            <div className="px-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-emerald-400 text-[9px] font-black uppercase tracking-wider mb-1">PRO</p>
                  <p className="text-white/80 text-[12px] font-bold leading-snug line-clamp-1">{hotRoom.pro_side || 'A측'}</p>
                </div>
                <span className="text-white/20 text-[11px] font-black shrink-0">VS</span>
                <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-red-400 text-[9px] font-black uppercase tracking-wider mb-1">CON</p>
                  <p className="text-white/80 text-[12px] font-bold leading-snug line-clamp-1">{hotRoom.con_side || 'B측'}</p>
                </div>
              </div>
            </div>

            {/* 하단 바 */}
            <div className="bg-white/5 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10">
                  <img src={hotRoom.creator?.avatar_url || getAvatarUrl(hotRoom.creator_id, hotRoom.creator?.gender) || DEFAULT_AVATAR_ICON} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-white/50 text-[11px] font-bold">{hotRoom.creator?.nickname || '방장'}</span>
              </div>
              <span className="text-[#D4AF37] text-[11px] font-black flex items-center gap-1">
                관전하기
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 6 15 12 9 18"/></svg>
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 빈 상태 */}
      {rooms.length === 0 && !loading && (
        <section className="px-5 mb-6">
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
            <div className="text-4xl mb-3">&#9878;</div>
            <h3 className="text-[16px] font-black text-[#1B2A4A] mb-1">진행 중인 실시간 논쟁이 없습니다</h3>
            <p className="text-[13px] text-gray-400">새 논쟁을 만들어보세요!</p>
          </div>
        </section>
      )}

      {/* 리스트 */}
      <main className="flex flex-col px-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-black text-[#1B2A4A]">실시간 논쟁 ({filteredRooms.length})</h2>
        </div>
        <CategoryFilter filter={filter} setFilter={setFilter} sortBy={sortBy} setSortBy={setSortBy} />
        <section className="mt-4 flex flex-col">
          <AnimatePresence mode="popLayout">
            {processedRooms.map((room, index) => {
              const isLast = processedRooms.length === index + 1 && filteredRooms.length > visibleCount;
              return (
                <motion.div key={room.id} ref={isLast ? lastElementRef : null} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <LobbyDebateCard room={room} onCardClick={handleCardClick} isKicked={kickedDebates.includes(room.id)} liveSlots={liveParticipants[room.id]} />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredRooms.length > visibleCount && (
            <div className="h-16 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#1B2A4A]/20 border-t-[#1B2A4A] rounded-full animate-spin" />
            </div>
          )}
        </section>
      </main>

      <MoragoraModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        type="confirm"
        title="로그인이 필요합니다"
        description="논쟁에 참여하시려면 로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?"
        onConfirm={() => { setLoginModalOpen(false); navigate('/login'); }}
      />
    </div>
  );
}
