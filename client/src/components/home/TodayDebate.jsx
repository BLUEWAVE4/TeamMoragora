import React from 'react';

export default function TodayDebate({ item }) {
  if (!item) return null;

  // 서버의 상태 값에 따라 '투표 종료' 여부를 판단합니다.
  // (예: item.status === 'closed' 혹은 남은 시간이 0일 때)
  const isClosed = item.status === 'closed' || item.remaining_days <= 0;

  return (
    <div className="px-6 pt-2">
      {/* 상단 타이틀 영역 */}
      <div className="flex justify-between items-end mb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
            HOT DEBATE
          </span>
          <h2 className="text-2xl font-black text-[#2D3350]">이번주 논쟁</h2>
        </div>
      </div>

      {/* 메인 배너 카드 */}
      <div className="relative w-full bg-[#2D3350] rounded-[40px] p-8 shadow-2xl shadow-[#2D3350]/20 overflow-hidden min-h-[220px] flex flex-col justify-between transition-all">
        
        {/* 💡 상태 태그: 종료 여부에 따라 색상과 텍스트 변경 */}
        <div className={`absolute top-6 left-8 px-4 py-1.5 text-white text-[10px] font-black rounded-full shadow-lg ${
          isClosed ? 'bg-gray-500' : 'bg-[#FF6B6B]'
        }`}>
          {isClosed ? '투표종료' : '투표진행중'}
        </div>
        
        {/* 논쟁 주제 */}
        <div className="mt-8">
          <h2 className="text-xl font-black text-white leading-tight break-keep">
            "{item.debate?.topic || '주제를 불러올 수 없습니다'}"
          </h2>
        </div>

        {/* 하단 통계 및 게이지 */}
        <div className="flex flex-col gap-2.5 mt-6">
          <div className="flex justify-between text-[11px] font-black text-white opacity-60">
            <span>찬성 {item.ai_score_a || 0}%</span>
            <span>반대 {item.ai_score_b || 0}%</span>
          </div>
          
          {/* 프로그레스 바: 종료 시 색상을 회색 톤으로 변경 가능 */}
          <div className="h-2 w-full bg-white/10 rounded-full flex overflow-hidden">
            <div 
              className={`${isClosed ? 'bg-gray-400' : 'bg-teal-400'} transition-all duration-1000`} 
              style={{ width: `${item.ai_score_a || 50}%` }} 
            />
            <div className={`${isClosed ? 'bg-gray-600' : 'bg-rose-400'} flex-1`} />
          </div>

          {/* 하단 정보 영역 */}
          <div className="flex justify-between items-center mt-3">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border-2 border-[#2D3350] bg-gray-200" />
              <div className="w-6 h-6 rounded-full border-2 border-[#2D3350] bg-gray-300" />
              <div className="w-6 h-6 rounded-full border-2 border-[#2D3350] bg-gray-400" />
            </div>
            <span className="text-[10px] font-bold text-white/40">1,000명 참여 중</span>
            
            {/* 💡 남은 시간 태그: 종료 시 '종료됨' 표시 */}
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
              isClosed 
              ? 'text-gray-400 bg-gray-400/10 border-gray-400/20' 
              : 'text-[#FFBD43] bg-[#FFBD43]/10 border-[#FFBD43]/20'
            }`}>
              {isClosed ? '⌛ 종료됨' : `⏳ ${item.remaining_days || 0}일 남음`}
            </span>
          </div>
        </div>
      </div>
      
      {/* 슬라이드 인디케이터 */}
      <div className="flex justify-center gap-1.5 mt-4">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        <div className="w-4 h-1.5 rounded-full bg-gray-800" />
      </div>
    </div>
  );
}