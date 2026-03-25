import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';

import CategoryFilter from '../../components/home/CategoryFilter';
import { getAllPublicDebates, incrementDebateView } from '../../services/api';
import { getAvatarUrl, DEFAULT_AVATAR_ICON } from '../../utils/avatar';

/**
 * 참여자 슬롯 컴포넌트
 */
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

/**
 * 일반 리스트 카드 컴포넌트
 */
function LobbyDebateCard({ room, formatTime }) {
  const navigate = useNavigate();
  const handleRoomClick = async () => {
    if (!room?.id) return;
    try { await incrementDebateView(room.id); } catch (e) {}
    const path = room.status === 'waiting' ? `/debate/${room.id}/chat` : `/debate/${room.id}`;
    navigate(path);
  };

  const creatorAvatarUrl = room.creator?.avatar_url || getAvatarUrl(room.creator_id, room.creator?.gender) || DEFAULT_AVATAR_ICON;
  const sideA = [room.creator?.nickname, room.side_a_2, room.side_a_3];
  const sideB = [room.opponent?.nickname, room.side_b_2, room.side_b_3];
  const currentTotal = [...sideA, ...sideB].filter(Boolean).length;

  return (
    <div onClick={handleRoomClick} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer active:scale-[0.99] transition-all mb-4">
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200/50">
            <img src={creatorAvatarUrl} alt="프로필" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-[#1B2A4A] text-[15px]">{room.creator?.nickname || '익명'}</span>
            <span className="text-[10px] text-gray-400 font-bold tracking-tight">{room.creator?.tier || '시민'}</span>
          </div>
        </div>
        <span className="text-[10px] text-gray-400 font-bold">{formatTime ? formatTime(room.created_at) : '방금 전'}</span>
      </div>
      <div className="mb-6">
        <h3 className="text-[18px] font-black text-[#1B2A4A] mb-3 leading-snug break-keep">{room.topic}</h3>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full ${room.status === 'waiting' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${room.status === 'waiting' ? 'bg-emerald-500' : 'bg-amber-400'} animate-pulse`} />
            {room.status === 'waiting' ? '참여 대기 중' : '토론 진행 중'} {currentTotal}/6
          </span>
          <span className="text-[11px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-1 rounded-full">{room.category}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 relative">
        <div className="flex-1 flex flex-col gap-1.5 p-3 rounded-2xl bg-[#F9FBF9]/70 border border-emerald-50">
          <div className="text-[10px] font-black text-emerald-700/40 mb-1 text-center">A측 명단</div>
          {sideA.map((p, i) => <ParticipantSlot key={`a-${i}`} name={p} color="emerald" isEmpty={!p} />)}
        </div>
        <div className="flex flex-col items-center justify-center"><span className="text-[11px] font-black text-gray-200 italic">VS</span></div>
        <div className="flex-1 flex flex-col gap-1.5 p-3 rounded-2xl bg-[#FDF9F9]/70 border border-red-50">
          <div className="text-[10px] font-black text-red-600/40 mb-1 text-center">B측 명단</div>
          {sideB.map((p, i) => <ParticipantSlot key={`b-${i}`} name={p} color="red" isEmpty={!p} />)}
        </div>
      </div>
    </div>
  );
}

export default function DebateLobbyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';

  const [rooms, setRooms] = useState([]);
  const [dailyItems, setDailyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('전체');
  const [sortBy, setSortBy] = useState('최신순');
  
  // 무한 스크롤을 위한 상태와 Ref
  const [visibleCount, setVisibleCount] = useState(5);
  const observerRef = useRef(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const dragX = useMotionValue(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAllPublicDebates();
      const rawRooms = res?.data || res || [];
      const lobbyRooms = rawRooms.filter(r => ['waiting', 'chatting'].includes(String(r.status).toLowerCase()));
      setRooms(lobbyRooms);
      setDailyItems(lobbyRooms.slice(0, 5));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 무한 스크롤 옵저버 설정
  const lastElementRef = useCallback((node) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => prev + 5);
      }
    });

    if (node) observerRef.current.observe(node);
  }, [loading]);

  useEffect(() => { setVisibleCount(5); }, [filter, searchQuery]);

  useEffect(() => {
    if (dailyItems.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % dailyItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [dailyItems.length]);

  const handleDragEnd = (event, info) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      setCurrentIndex(prev => (prev + 1) % dailyItems.length);
    } else if (info.offset.x > swipeThreshold) {
      setCurrentIndex(prev => (prev - 1 + dailyItems.length) % dailyItems.length);
    }
  };

  const filteredRooms = rooms
    .filter(r => (filter === '전체' || r.category === filter) && (!searchQuery || r.topic.toLowerCase().includes(searchQuery)))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const processedRooms = filteredRooms.slice(0, visibleCount);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const past = new Date(dateString);
    const diffInMin = Math.floor((now - past) / 60000);
    if (diffInMin < 1) return '방금 전';
    if (diffInMin < 60) return `${diffInMin}분 전`;
    if (diffInMin < 1440) return `${Math.floor(diffInMin / 60)}시간 전`;
    return past.toLocaleDateString();
  };

  const getParticipantCount = (item) => {
    return [item.creator?.nickname, item.side_a_2, item.side_a_3, item.opponent?.nickname, item.side_b_2, item.side_b_3].filter(Boolean).length;
  };

  if (loading) return <div className="min-h-screen bg-[#F3F1EC] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#1B2A4A] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F1EC] pb-32 pt-4">
      {/* 슬라이더 영역 생략 (동일) */}
      <section className="px-5 mb-8">
        <div className="bg-[#1B2A4A] rounded-2xl p-8 text-white shadow-xl relative overflow-hidden h-[220px]">
          <AnimatePresence initial={false} mode="wait">
            {dailyItems.length > 0 && (
              <motion.div 
                key={currentIndex}
                style={{ x: dragX }}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{
                  x: { type: "tween", ease: "easeOut", duration: 0.35 },
                  opacity: { duration: 0.2 }
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0}
                onDragEnd={handleDragEnd}
                className="h-full flex flex-col justify-between cursor-grab active:cursor-grabbing"
              >
                <div onClick={() => {
                   const r = dailyItems[currentIndex];
                   navigate(r.status === 'waiting' ? `/debate/${r.id}/chat` : `/debate/${r.id}`);
                }}>
                  <span className="text-[12px] text-[#D4AF37] font-extrabold mb-2 block tracking-widest">추천 실시간 논쟁</span>
                  <h2 className="text-[22px] font-black leading-tight break-keep">"{dailyItems[currentIndex].topic}"</h2>
                </div>
                <div className="flex justify-between items-end border-t border-white/10 pt-4 pointer-events-none">
                  <span className="text-[12px] opacity-60 font-black">{dailyItems[currentIndex].category}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full ${
                      dailyItems[currentIndex].status === 'waiting' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${dailyItems[currentIndex].status === 'waiting' ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
                      {dailyItems[currentIndex].status === 'waiting' ? '대기 중' : '진행 중'} {getParticipantCount(dailyItems[currentIndex])}/6
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
            {dailyItems.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-5 bg-[#D4AF37]' : 'w-1.5 bg-white/20'}`} />
            ))}
          </div>
        </div>
      </section>

      <main className="flex flex-col px-5">
        <CategoryFilter filter={filter} setFilter={setFilter} sortBy={sortBy} setSortBy={setSortBy} />
        <section className="mt-6 flex flex-col">
          <AnimatePresence mode="popLayout">
            {processedRooms.map((room, index) => {
              // 마지막 요소에 ref를 달아 스크롤 감지
              if (processedRooms.length === index + 1 && filteredRooms.length > visibleCount) {
                return (
                  <motion.div key={room.id} ref={lastElementRef} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <LobbyDebateCard room={room} formatTime={formatTime} />
                  </motion.div>
                );
              }
              return (
                <motion.div key={room.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <LobbyDebateCard room={room} formatTime={formatTime} />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* 더 불러올 데이터가 있을 때만 로딩 표시 (선택사항) */}
          {filteredRooms.length > visibleCount && (
            <div className="h-20 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#1B2A4A]/20 border-t-[#1B2A4A] rounded-full animate-spin" />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}