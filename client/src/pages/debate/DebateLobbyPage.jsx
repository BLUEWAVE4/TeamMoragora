import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// ✅ getMyActiveDebates 대신 전체 피드를 가져오는 getVerdictFeed 등을 확인해보세요.
// 여기서는 일단 모든 방을 가져오는 API가 getActiveDebates라고 가정합니다.
import { getMyActiveDebates as getActiveDebates } from '../../services/api'; 
import { useAuth } from '../../store/AuthContext';

// ── 1. 카드 컴포넌트 (LobbyDebateCard) ──
function LobbyDebateCard({ debate, currentUser }) {
  if (!debate) return null; //

  const isCreator = currentUser?.id === debate.creator_id;
  const statusLabel = debate.status === 'arguing' ? '진행중' : '대기중';

  const renderParticipantSlots = (participants = [], colorClass) => {
    const maxSlots = 2; 
    const slots = [];
    participants.forEach((p, i) => {
      slots.push(
        <div key={`p-${i}`} className="flex items-center gap-1 bg-white border border-gray-100 px-2 py-1 rounded-lg shadow-sm">
          <span className={`${colorClass} text-[8px]`}>●</span>
          <span className="text-[11px] font-bold text-gray-700">{p.nickname}</span>
        </div>
      );
    });
    for (let i = slots.length; i < maxSlots; i++) {
      slots.push(
        <div key={`empty-${i}`} className="border border-dashed border-gray-200 px-2 py-1 rounded-lg bg-gray-50/50 flex items-center gap-1">
          <span className="text-[10px] text-gray-300 font-medium">● 빈 자리</span>
        </div>
      );
    }
    return slots;
  };

  return (
    <div className="mx-5 mb-4 rounded-[24px] p-5 bg-white shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#E8C44D] flex items-center justify-center text-white font-black text-sm border-2 border-white shadow-sm">
            {debate.creator_nickname?.charAt(0) || 'U'}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-black text-[#1B2A4A]">{debate.creator_nickname}</span>
            {isCreator && <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">내 방</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-[11px] font-bold ${debate.status === 'arguing' ? 'text-[#D4AF37]' : 'text-[#39A388]'}`}>
            ● {statusLabel} {debate.current_participants || 1}/{debate.max_participants || 4}
          </span>
        </div>
      </div>

      <h2 className="text-[17px] font-black text-[#1B2A4A] mb-4 leading-snug">{debate.topic}</h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#F8F9FA] rounded-[18px] p-3 border border-gray-50/50">
          <p className="text-[10px] text-[#39A388] font-bold mb-2">A측 · {debate.pro_side_name}</p>
          <div className="flex flex-wrap gap-1">
            {renderParticipantSlots(debate.pro_participants, 'text-[#39A388]')}
          </div>
        </div>
        <div className="bg-[#F8F9FA] rounded-[18px] p-3 border border-gray-50/50">
          <p className="text-[10px] text-[#E57373] font-bold mb-2">B측 · {debate.con_side_name}</p>
          <div className="flex flex-wrap gap-1">
            {renderParticipantSlots(debate.con_participants, 'text-[#E57373]')}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">{debate.category}</span>
          <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">{debate.time_limit}분</span>
        </div>
        <span className="text-[11px] text-gray-300 font-bold">1분 전</span>
      </div>
    </div>
  );
}

// ── 2. 메인 로비 페이지 (DebateLobbyPage) ──
export default function DebateLobbyPage() {
  const { user } = useAuth();
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadActiveDebates = useCallback(async () => {
    try {
      // ⚠️ 주의: getMyActiveDebates는 본인 데이터만 가져올 가능성이 큽니다.
      // 만약 전체 목록 API가 따로 있다면 해당 함수로 교체하세요.
      const res = await getActiveDebates(); 
      const allItems = res?.items || []; 

      // ✅ 핵심: 모든 데이터 중 '진행 중'이거나 '대기 중'인 것만 필터링
      const liveOnly = allItems.filter(d => 
        d.status === 'waiting' || d.status === 'arguing'
      );

      setDebates(liveOnly);
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActiveDebates();
    const interval = setInterval(loadActiveDebates, 5000);
    return () => clearInterval(interval);
  }, [loadActiveDebates]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F1EC] pb-24">
      <header className="bg-[#1B2A4A] pt-12 pb-14 px-6 rounded-b-[40px] shadow-lg mb-8">
        <h1 className="text-white text-3xl font-black italic tracking-tighter">실시간 논쟁 목록</h1>
        <p className="text-white/40 text-[12px] mt-2 font-bold font-sans">지금 바로 참여할 수 있는 뜨거운 논쟁들</p>
      </header>

      <main className="flex flex-col gap-1">
        {loading ? (
          <div className="text-center py-20 text-gray-400 font-bold">불러오는 중...</div>
        ) : debates.length === 0 ? (
          <div className="py-20 text-center text-gray-400 font-bold font-sans">실시간 진행 중인 논쟁이 없습니다.</div>
        ) : (
          debates.map((debate) => (
            <LobbyDebateCard key={debate.id} debate={debate} currentUser={user} />
          ))
        )}
      </main>
    </div>
  );
}