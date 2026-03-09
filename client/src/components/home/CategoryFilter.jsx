import React from 'react';

export default function CategoryFilter({ filter, setFilter }) {
  // 💡 세련된 SVG 아이콘 정의
  const categories = [
    { 
      name: '전체', key: '전체', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
      )
    },
    { 
      name: '일상', key: 'daily', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      )
    },
    { 
      name: '연애', key: 'love', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      )
    },
    { 
      name: '음식', key: 'food', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
        </svg>
      )
    },
    { 
      name: '직장', key: 'work', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      )
    },
    { 
      name: '취미', key: 'hobby', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
        </svg>
      )
    }
  ];

  return (
    <div className="py-4 border-b border-gray-100 bg-[#F8F9FA]">
      <div className="flex gap-3 px-6 overflow-x-auto no-scrollbar scroll-smooth w-full items-center">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-[14px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              filter === cat.key
                ? 'bg-[#2D3350] text-white shadow-lg shadow-[#2D3350]/20 scale-105'
                : 'bg-white text-gray-400 border border-gray-100 shadow-sm hover:text-gray-600'
            }`}
          >
            {/* 아이콘 컬러 처리: 선택 시 white, 평소엔 현재 텍스트 컬러 유지 */}
            <span className={filter === cat.key ? "text-white" : "text-gray-400"}>
              {cat.icon}
            </span>
            <span>{cat.name}</span>
          </button>
        ))}
        <div className="min-w-[24px] h-1 flex-shrink-0" />
      </div>
    </div>
  );
}