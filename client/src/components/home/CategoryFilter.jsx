import React from 'react';

export default function CategoryFilter({ filter, setFilter }) {
  const categories = [
    { name: '전체', key: '전체', icon: '🌐' },
    { name: '일상', key: 'daily', icon: '🏠' },
    { name: '연애', key: 'love', icon: '❤️' },
    { name: '음식', key: 'food', icon: '🍱' },
    { name: '직장', key: 'work', icon: '🏢' },
    { name: '취미', key: 'hobby', icon: '🎨' }
  ];

  return (
    /* 💡 부모 div에서 overflow-hidden을 제거하여 내부 스크롤이 작동하게 함 */
    <div className="py-4 border-b border-gray-50/50 bg-[#F8F9FA]">
      {/* 💡 수정 포인트: min-w-max 제거, w-full 및 overflow-x-auto 추가 */}
      <div className="flex gap-3 px-6 overflow-x-auto no-scrollbar scroll-smooth w-full items-center">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-[14px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              filter === cat.key
                ? 'bg-[#2D3350] text-white shadow-md scale-105'
                : 'bg-white text-gray-500 border border-gray-100 shadow-sm'
            }`}
          >
            <span className="text-base">{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
        {/* 스크롤 끝 여백 확보용 dummy div */}
        <div className="min-w-[24px] h-1 flex-shrink-0" />
      </div>
    </div>
  );
}