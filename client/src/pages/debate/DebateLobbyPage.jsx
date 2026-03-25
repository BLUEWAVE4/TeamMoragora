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
    if (remaining <= 0) return <span className="text-red-500 font-black text-[11px]">종료 임박</span>;
    return (
      <span className="text-amber-600 font-black text-[12px] tabular-nums">
        {pad(min)}:{pad(sec)} 남음
      </span>
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

// ===== 카드 =====
function LobbyDebateCard({ room, onCardClick }) {
  const creatorAvatarUrl = room.creator?.avatar_url || getAvatarUrl(room.creator_id, room.creator?.gender) || DEFAULT_AVATAR_ICON;

  const creatorName = room.creator?.nickname || '방장';
  const opponentName = room.opponent?.nickname || null;
  const currentTotal = [creatorName, opponentName].filter(Boolean).length;

  const statusConfig = {
    waiting: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', label: '대기 중' },
    chatting: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400', label: '토론 중' },
    judging: { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500', label: '판결 중' },
  };
  const sc = statusConfig[room.status] || statusConfig.waiting;

  return (
    <div onClick={() => onCardClick(room)} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer active:scale-[0.99] transition-all mb-3">
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
        <span className={`flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full ${sc.bg} ${sc.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} animate-pulse`} />
          {sc.label} {currentTotal}/2
        </span>
        <span className="text-[11px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-1 rounded-full">{room.category}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 flex flex-col gap-1 p-2.5 rounded-xl bg-[#F9FBF9]/70 border border-emerald-50">
          <div className="text-[9px] font-black text-emerald-700/40 text-center mb-0.5">A측</div>
          <ParticipantSlot name={creatorName} color="emerald" isEmpty={false} />
        </div>
        <span className="text-[10px] font-black text-gray-200">VS</span>
        <div className="flex-1 flex flex-col gap-1 p-2.5 rounded-xl bg-[#FDF9F9]/70 border border-red-50">
          <div className="text-[9px] font-black text-red-600/40 text-center mb-0.5">B측</div>
          <ParticipantSlot name={opponentName} color="red" isEmpty={!opponentName} />
        </div>
      </div>
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

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await getAllPublicDebates();
      const rawRooms = res?.data || res || [];
      const lobbyRooms = rawRooms.filter(r => ['waiting', 'chatting'].includes(String(r.status).toLowerCase()));
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

  // 슬라이더 자동 회전
  const featuredRooms = rooms.filter(r => r.status === 'chatting').slice(0, 5);
  useEffect(() => {
    if (featuredRooms.length <= 1) return;
    const timer = setInterval(() => setCurrentIndex(prev => (prev + 1) % featuredRooms.length), 5000);
    return () => clearInterval(timer);
  }, [featuredRooms.length]);

  const handleDragEnd = (_, info) => {
    if (featuredRooms.length <= 1) return;
    if (info.offset.x < -50) setCurrentIndex(prev => (prev + 1) % featuredRooms.length);
    else if (info.offset.x > 50) setCurrentIndex(prev => (prev - 1 + featuredRooms.length) % featuredRooms.length);
  };

  const handleCardClick = async (room) => {
    if (!room?.id) return;
    if (!user) { setLoginModalOpen(true); return; }
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
      {/* 진행 중인 논쟁 슬라이더 */}
      {featuredRooms.length > 0 && (
        <section className="px-5 mb-6">
          <div className="bg-[#1B2A4A] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden h-[200px]">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -80 }}
                transition={{ x: { type: "tween", ease: "easeOut", duration: 0.3 }, opacity: { duration: 0.2 } }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
                onDragEnd={handleDragEnd}
                onClick={() => handleCardClick(featuredRooms[currentIndex])}
                className="h-full flex flex-col justify-between cursor-pointer active:cursor-grabbing touch-none"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-[#D4AF37] font-extrabold tracking-widest">LIVE 토론 중</span>
                    <LiveTimer
                      createdAt={featuredRooms[currentIndex].created_at}
                      chatDeadline={featuredRooms[currentIndex].chat_deadline}
                      status="chatting"
                    />
                  </div>
                  <h2 className="text-[20px] font-black leading-tight break-keep">"{featuredRooms[currentIndex].topic}"</h2>
                </div>
                <div className="flex justify-between items-end border-t border-white/10 pt-3 pointer-events-none">
                  <span className="text-[11px] opacity-50 font-bold">{featuredRooms[currentIndex].category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-white/60 font-bold">
                      {featuredRooms[currentIndex].creator?.nickname || '?'}
                    </span>
                    <span className="text-white/30 text-[10px]">vs</span>
                    <span className="text-[11px] text-white/60 font-bold">
                      {featuredRooms[currentIndex].opponent?.nickname || '대기 중'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            {featuredRooms.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                {featuredRooms.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-5 bg-[#D4AF37]' : 'w-1.5 bg-white/20'}`} />
                ))}
              </div>
            )}
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
                  <LobbyDebateCard room={room} onCardClick={handleCardClick} />
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
