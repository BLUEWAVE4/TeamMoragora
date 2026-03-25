import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyActiveDebates, getAllPublicDebates } from '../../services/api';

// ── 1. [하단] 실시간 로비 카드 컴포넌트 (image_3.png 스타일) ──
function RealTimeDebateCard({ room }) {
  const navigate = useNavigate();
  const mode = String(room.mode || '').toLowerCase();
  
  // 상태 및 참여 인원 계산 (image_3.png 기준 4명)
  const isWaiting = room.status === 'waiting';
  
  // 가이드: creator(A1), opponent(B1). 배심원/판사는 서버 데이터 구조에 따라 달라짐
  const participants = {
    A1: room.creator?.nickname || '빈 자리',
    A2: room.side_a_2 || '빈 자리', // 서버에 해당 필드가 있다고 가정
    B1: room.opponent?.nickname || '빈 자리',
    B2: room.side_b_2 || '빈 자리'  // 서버에 해당 필드가 있다고 가정
  };

  // 실제 참여자 수 계산 (빈 자리가 아닌 경우)
  const currentCount = [participants.A1, participants.A2, participants.B1, participants.B2]
    .filter(name => name !== '빈 자리').length;

  const handleMove = () => {
    if (mode === 'chat') navigate(`/debate/${room.id}/chat`);
    else navigate(`/debate/${room.id}`);
  };

  // 태그 색상 매핑
  const categoryColors = {
    일상: 'bg-gray-100 text-gray-500',
    사회: 'bg-amber-50 text-amber-600',
    교육: 'bg-emerald-50 text-emerald-600',
    연애: 'bg-red-50 text-red-600'
  };
  const tagClass = categoryColors[room.category] || 'bg-gray-100 text-gray-500';

  return (
    <div 
      onClick={handleMove}
      className="bg-white rounded-3xl p-6 mb-5 shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-all"
    >
      {/* 헤더: 유저 정보 및 상태 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E8C44D] flex items-center justify-center text-white font-black uppercase shadow-inner text-lg">
            {room.creator?.nickname?.[0] || 'U'}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-black text-[#1B2A4A]">{room.creator?.nickname || '익명'}</span>
            <span className="text-[11px] bg-emerald-50 text-emerald-500 px-2 py-0.5 rounded font-bold">배심원</span>
          </div>
        </div>
        
        {/* 상태 표시 (image_3.png 스타일) */}
        <div className={`flex items-center gap-1.5 font-bold text-xs ${isWaiting ? 'text-emerald-500' : 'text-amber-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isWaiting ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          {isWaiting ? '대기중' : '진행중'} {currentCount}/4
        </div>
      </div>

      {/* 주제 */}
      <h2 className="text-[18px] font-black text-[#1B2A4A] leading-snug mb-5">{room.topic}</h2>

      {/* 참여자 영역 (grid) */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5">
        {/* A축 */}
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <p className="text-[11px] font-bold text-emerald-600 mb-2">A축 · {room.pro_side}</p>
          <div className="flex flex-wrap gap-2">
            {[participants.A1, participants.A2].map((name, i) => (
              <span key={i} className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                name === '빈 자리' ? 'bg-white text-gray-300 border border-dashed' : 'bg-white text-gray-600 border'
              }`}>
                <span className={`w-1 h-1 rounded-full ${name === '빈 자리' ? 'bg-gray-200' : 'bg-emerald-500'}`}></span>
                {name}
              </span>
            ))}
          </div>
        </div>
        {/* B축 */}
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <p className="text-[11px] font-bold text-red-500 mb-2">B축 · {room.con_side}</p>
          <div className="flex flex-wrap gap-2">
            {[participants.B1, participants.B2].map((name, i) => (
              <span key={i} className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                name === '빈 자리' ? 'bg-white text-gray-300 border border-dashed' : 'bg-white text-gray-600 border'
              }`}>
                <span className={`w-1 h-1 rounded-full ${name === '빈 자리' ? 'bg-gray-200' : 'bg-red-400'}`}></span>
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 푸터: 태그 및 시간 */}
      <div className="flex justify-between items-center text-[12px] text-gray-400 font-medium border-t pt-4">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full font-bold ${tagClass}`}>{room.category || '일반'}</span>
          <span className="px-3 py-1 rounded-full bg-gray-100 font-bold text-gray-500">{room.time_limit || '5분'}</span>
          {!isWaiting && (
            <span className="flex items-center gap-1 text-red-500 font-bold">
              <span className="text-xs">⏱</span> 3:12 경과
            </span>
          )}
        </div>
        <span>1분 전</span>
      </div>
    </div>
  );
}

// ── 2. [상단] AI 추천 논쟁 섹션 (image_4.png 스타일) ──
function AiRecommendationSection() {
  // ※ 추후 API 연결 영역
  const mockAiData = {
    topic: "대학교 과제는 ChatGPT 써서 해도 된다",
    sideA: "효율적 학습 도구다",
    sideB: "명백한 부정행위다",
    userA: { name: "클로드", avatar: "👩‍🦰" },
    userB: { name: "지피티", avatar: "👨‍🦱" },
    time: "18:23:07"
  };

  return (
    <section className="mb-10">
      {/* 네이비 카드 */}
      <div className="bg-[#1B2A4A] rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden mb-6">
        {/* 헤더: VS 유저 */}
        <div className="flex justify-center items-center gap-4 mb-8 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{mockAiData.userA.avatar}</span>
            <span className="font-bold text-sm text-white/80">{mockAiData.userA.name}</span>
          </div>
          <span className="text-[#E8C44D] font-black italic text-lg">VS</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white/80">{mockAiData.userB.name}</span>
            <span className="text-2xl">{mockAiData.userB.avatar}</span>
          </div>
          {/* 화살표 아이콘 */}
          <span className="absolute right-0 text-white/30 text-xl font-light">〉</span>
        </div>

        {/* 주제 */}
        <h1 className="text-center text-[22px] font-black leading-snug mb-10 px-4">
          "{mockAiData.topic}"
        </h1>

        {/* 버튼 2개 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button className="bg-white/5 border border-white/10 py-4 rounded-xl font-bold text-[14px] text-[#E8C44D] hover:bg-white/10 transition-all">
            {mockAiData.sideA}
          </button>
          <button className="bg-white/5 border border-white/10 py-4 rounded-xl font-bold text-[14px] text-[#E8C44D] hover:bg-white/10 transition-all">
            {mockAiData.sideB}
          </button>
        </div>

        {/* 푸터: 아이콘 및 시간 */}
        <div className="flex justify-between items-center text-xs text-white/40 font-mono border-t border-white/10 pt-5">
          <div className="flex items-center gap-4">
            <span>🤍 0</span>
            <span>💬 0</span>
            <span>👁 1</span>
          </div>
          <span className="text-[#E8C44D] font-bold">{mockAiData.time}</span>
        </div>
      </div>

      {/* 페이지네이션 도트 (임시) */}
      <div className="flex justify-center gap-2">
        <span className="w-6 h-1.5 bg-[#1B2A4A] rounded-full"></span>
        <span className="w-1.5 h-1.5 bg-gray-200 rounded-full"></span>
        <span className="w-1.5 h-1.5 bg-gray-200 rounded-full"></span>
      </div>
    </section>
  );
}

// ── 3. 메인 로비 페이지 ──
export default function DebateLobbyPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [myRes, publicRes] = await Promise.allSettled([
        getMyActiveDebates(),
        getAllPublicDebates()
      ]);

      const myData = myRes.status === 'fulfilled' ? (myRes.value?.items || myRes.value || []) : [];
      const publicData = publicRes.status === 'fulfilled' ? publicRes.value : [];

      const uniqueMap = new Map();
      [...myData, ...publicData].forEach(r => {
        if (r && r.id) uniqueMap.set(String(r.id), r);
      });

      // 대기중/진행중인 실시간 논쟁만 필터링
      const final = Array.from(uniqueMap.values()).filter(r => {
        const status = String(r.status || '').toLowerCase();
        return status === 'waiting' || status === 'chatting';
      });

      // 최신순 정렬
      final.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRooms(final);
    } catch (err) {
      console.error("로비 데이터 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000); // 10초마다 갱신
    return () => clearInterval(timer);
  }, [loadData]);

  return (
    // 배경색을 image_4.png와 유사한 연한 베이지색으로 설정
    <div className="min-h-screen bg-[#F8F7F4] pb-24 text-[#1B2A4A]">
      
      {/* 메인 컨텐츠 영역 */}
      <main className="px-5 pt-8 max-w-2xl mx-auto">
        
        {/* 1. 상단: AI 추천 섹션 (image_4.png 스타일) */}
        <AiRecommendationSection />

        {/* 2. 하단: 실시간 논쟁 로비 (image_3.png 스타일) */}
        <section className="mt-12">
          {/* 섹션 헤더 및 필터 (image_4.png 스타일 참조) */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-full bg-[#1B2A4A] text-white font-bold text-sm">전체</button>
              <button className="px-4 py-2 rounded-full bg-white text-gray-500 font-bold text-sm border">일상</button>
              <button className="px-4 py-2 rounded-full bg-white text-gray-500 font-bold text-sm border">사회</button>
            </div>
            <button className="text-gray-500 text-sm font-bold flex items-center gap-1">
              최신순 <span className="text-xs">▼</span>
            </button>
          </div>

          {/* 로딩 및 카드 리스트 */}
          {loading && rooms.length === 0 ? (
            <div className="py-20 text-center text-gray-400 font-bold animate-pulse">실시간 논쟁 불러오는 중...</div>
          ) : rooms.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200 shadow-sm">
              <p className="text-gray-400 font-bold">현재 진행 중인 실시간 논쟁이 없습니다.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {rooms.map(room => (
                <RealTimeDebateCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}