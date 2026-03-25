import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import CategoryFilter from '../../components/home/CategoryFilter';
import { getAllPublicDebates, incrementDebateView } from '../../services/api';
import { getAvatarUrl, DEFAULT_AVATAR_ICON } from '../../utils/avatar';
import { useAuth } from "../../store/AuthContext";
import MoragoraModal from '../../components/common/MoragoraModal';

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
function LobbyDebateCard({ room, formatTime, onCardClick }) {
  // 등급별 색상 매핑
  const tierColors = {
    '브론즈': 'bg-[#CD7F32]/10 text-[#CD7F32]',
    '실버': 'bg-[#C0C0C0]/15 text-[#A0A0A0]',
    '골드': 'bg-[#FFD700]/10 text-[#D4AF37]',
    '플래티넘': 'bg-[#00CED1]/10 text-[#008B8B]',
    '다이아': 'bg-[#1E90FF]/10 text-[#1E90FF]',
    '마스터': 'bg-[#800080]/10 text-[#800080]',
    '챌린저': 'bg-[#FF4500]/10 text-[#FF4500]',
    '시민': 'bg-gray-100 text-gray-400'
  };
  const userTier = room.creator?.tier || '시민';
  const tierClass = tierColors[userTier] || tierColors['시민'];

  // 방장 및 상대방 닉네임 백업 (토론 시작 후 슬롯 유실 방지)
  const creatorName = room.creator?.nickname || room.side_a_1 || '방장';
  const opponentName = room.opponent?.nickname || room.side_b_1 || '상대방';

  // 명단 구성 로직: 시작(chatting) 상태면 최소한 1:1 명단은 유지
  const sideA_List = [
    room.side_a_1 || (room.status === 'chatting' ? creatorName : null),
    room.side_a_2,
    room.side_a_3
  ];
  const sideB_List = [
    room.side_b_1 || (room.status === 'chatting' ? opponentName : null),
    room.side_b_2,
    room.side_b_3
  ];

  const activeA = sideA_List.filter(Boolean);
  const activeB = sideB_List.filter(Boolean);
  const currentTotal = activeA.length + activeB.length;

  // 진행 중 조건: 양측 1명 이상 & chatting 상태
  const isOngoing = activeA.length >= 1 && activeB.length >= 1 && room.status?.toLowerCase() === 'chatting';
  const creatorAvatarUrl = room.creator?.avatar_url || getAvatarUrl(room.creator_id, room.creator?.gender) || DEFAULT_AVATAR_ICON;

  return (
    <div onClick={() => onCardClick(room)} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer active:scale-[0.99] transition-all mb-4">
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200/50">
            <img src={creatorAvatarUrl} alt="프로필" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-1">
               <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">방장</span>
               <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${tierClass}`}>{userTier}</span>
            </div>
            <span className="font-black text-[#1B2A4A] text-[15px] leading-none">{room.creator?.nickname || '익명'}</span>
          </div>
        </div>
        <span className="text-[10px] text-gray-400 font-bold">{formatTime ? formatTime(room.created_at) : '방금 전'}</span>
      </div>

      <div className="mb-6">
        <h3 className="text-[18px] font-black text-[#1B2A4A] mb-3 leading-snug break-keep">{room.topic}</h3>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full ${isOngoing ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOngoing ? 'bg-amber-400' : 'bg-emerald-500'} animate-pulse`} />
            {isOngoing ? '토론 진행 중' : '참여 대기 중'} {currentTotal}/6
          </span>
          <span className="text-[11px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-1 rounded-full">{room.category}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 relative">
        <div className="flex-1 flex flex-col gap-1.5 p-3 rounded-2xl bg-[#F9FBF9]/70 border border-emerald-50">
          <div className="text-[10px] font-black text-emerald-700/40 mb-1 text-center">A측 참여자</div>
          {sideA_List.map((p, i) => <ParticipantSlot key={`a-${i}`} name={p} color="emerald" isEmpty={!p} />)}
        </div>
        <div className="flex flex-col items-center justify-center"><span className="text-[11px] font-black text-gray-200 italic">VS</span></div>
        <div className="flex-1 flex flex-col gap-1.5 p-3 rounded-2xl bg-[#FDF9F9]/70 border border-red-50">
          <div className="text-[10px] font-black text-red-600/40 mb-1 text-center">B측 참여자</div>
          {sideB_List.map((p, i) => <ParticipantSlot key={`b-${i}`} name={p} color="red" isEmpty={!p} />)}
        </div>
      </div>
    </div>
  );
}

export default function DebateLobbyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';

  const [rooms, setRooms] = useState([]);
  const [dailyItems, setDailyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('전체');
  const [sortBy, setSortBy] = useState('최신순');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const observerRef = useRef(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

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

  // 자동 슬라이드 (5초)
  useEffect(() => {
    if (dailyItems.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % dailyItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [dailyItems.length]);

  const handleCardClick = async (room) => {
    if (!user) { setLoginModalOpen(true); return; }
    if (!room?.id) return;
    try { await incrementDebateView(room.id); } catch (e) {}
    
    const sideA = [room.side_a_1, room.side_a_2, room.side_a_3].filter(Boolean);
    const sideB = [room.side_b_1, room.side_b_2, room.side_b_3].filter(Boolean);
    const isOngoing = (sideA.length >= 1 && sideB.length >= 1) || room.status?.toLowerCase() === 'chatting';
    
    // 진행 중이면 중계/채팅방으로, 대기 중이면 대기실로
    const path = isOngoing ? `/debate/${room.id}/chat` : `/debate/${room.id}`;
    navigate(path);
  };

  const onDragEnd = (e, { offset }) => {
    const swipeThreshold = 50; 
    if (offset.x > swipeThreshold) {
      setDirection(-1);
      setCurrentIndex((prev) => (prev - 1 + dailyItems.length) % dailyItems.length);
    } else if (offset.x < -swipeThreshold) {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % dailyItems.length);
    }
  };

  const lastElementRef = useCallback((node) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { setVisibleCount((prev) => prev + 5); }
    });
    if (node) observerRef.current.observe(node);
  }, [loading]);

  const filteredRooms = rooms
    .filter(r => (filter === '전체' || r.category === filter) && (!searchQuery || r.topic.toLowerCase().includes(searchQuery)))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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

  if (loading) return <div className="min-h-screen bg-[#F3F1EC] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#1B2A4A] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F1EC] pb-32 pt-4">
      {/* 🚀 AI 추천 슬라이더 섹션 */}
      <section className="px-5 mb-8">
        <div className="bg-[#1B2A4A] rounded-2xl text-white shadow-xl relative overflow-hidden h-[220px]">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            {dailyItems.length > 0 && (
              <motion.div 
                key={currentIndex}
                custom={direction}
                initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0} // ✅ 탄성 제거
                onDragEnd={onDragEnd}
                onClickCapture={(e) => { if (Math.abs(e.movementX) > 5) e.stopPropagation(); }}
                onClick={() => handleCardClick(dailyItems[currentIndex])} // ✅ 클릭 시 이동
                className="h-full w-full p-8 flex flex-col justify-between cursor-pointer active:cursor-grabbing touch-none"
              >
                <div>
                  <span className="text-[12px] text-[#D4AF37] font-extrabold mb-2 block tracking-widest uppercase">추천 실시간 논쟁</span>
                  <h2 className="text-[22px] font-black leading-tight break-keep">"{dailyItems[currentIndex].topic}"</h2>
                </div>
                <div className="flex justify-between items-end border-t border-white/10 pt-4">
                  <span className="text-[12px] opacity-60 font-black">{dailyItems[currentIndex].category}</span>
                  <div className="flex gap-1.5">
                    {dailyItems.map((_, i) => (
                      <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-4 bg-[#D4AF37]' : 'w-1 bg-white/20'}`} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <main className="flex flex-col px-5">
        <CategoryFilter filter={filter} setFilter={setFilter} sortBy={sortBy} setSortBy={setSortBy} />
        <section className="mt-6 flex flex-col">
          <AnimatePresence mode="popLayout">
            {filteredRooms.slice(0, visibleCount).map((room, index) => {
              const isLast = filteredRooms.slice(0, visibleCount).length === index + 1 && filteredRooms.length > visibleCount;
              return (
                <motion.div key={room.id} ref={isLast ? lastElementRef : null} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <LobbyDebateCard room={room} formatTime={formatTime} onCardClick={handleCardClick} />
                </motion.div>
              );
            })}
          </AnimatePresence>
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