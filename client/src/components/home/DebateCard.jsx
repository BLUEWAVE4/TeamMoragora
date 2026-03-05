import React from 'react';

// props를 통해 각기 다른 데이터를 받아 렌더링합니다.
export default function DebateCard({ category, title, time, winSide, scoreA, scoreB, tags, stats }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 mb-1">
      {/* 상단 카테고리 태그 및 시간 */}
      <div className="flex justify-between items-start mb-4">
        <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black ${category.bgColor} ${category.textColor}`}>
          {category.icon} {category.name}
        </span>
        <span className="text-gray-300 text-[11px]">{time}</span>
      </div>

      {/* 논쟁 제목 */}
      <h3 className="font-bold text-[17px] text-gray-800 mb-4 leading-tight">
        "{title}"
      </h3>

      {/* 특성 배지 (AI 비율, 성향 등) */}
      <div className="flex gap-2 mb-6">
        {tags.map((tag, index) => (
          <div key={index} className={`flex items-center gap-1 px-2 py-1 rounded-md ${tag.bgColor}`}>
            <span className="text-[10px]">{tag.icon}</span>
            <span className={`text-[10px] font-bold ${tag.textColor}`}>{tag.text}</span>
          </div>
        ))}
      </div>

      {/* 판결 결과 영역 */}
      <div className="flex items-center justify-between border-t border-gray-50 pt-4">
        <div className="flex items-center gap-2">
          <span className={`${winSide.includes('A') ? 'text-[#00C193]' : 'text-blue-500'} font-black text-sm`}>
            {winSide} 승리
          </span>
          <span className="text-gray-900 font-bold text-sm">
            {scoreA} <span className="text-gray-200 font-normal mx-0.5">vs</span> {scoreB}
          </span>
        </div>
        
        {/* AI 모델 아이콘들 */}
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold">G</div>
          <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold">M</div>
          <div className="w-6 h-6 rounded-full bg-orange-400 border-2 border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold">C</div>
        </div>
      </div>

      {/* 하단 반응 수치 */}
      <div className="flex gap-4 mt-4 pt-3 border-t border-gray-50 text-gray-400">
        <div className="flex items-center gap-1">
          <span className="text-xs">❤️</span> <span className="text-[11px]">{stats.likes}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs">👁️</span> <span className="text-[11px]">{stats.views}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs">💬</span> <span className="text-[11px]">{stats.comments}</span>
        </div>
      </div>
    </div>
  );
}