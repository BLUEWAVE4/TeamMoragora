import React from 'react';

export default function CategoryFilter({ activeCategory, setActiveCategory, sortBy, setSortBy }) {
  const CATEGORIES = [
    { icon: '🌐', label: '전체' },
    { icon: '🏠', label: '일상' },
    { icon: '💕', label: '연애' },
    { icon: '🍱', label: '음식' },
    { icon: '🏢', label: '직장' },
    { icon: '⚖️', label: '사회' }
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center px-1">
        <span className="text-[13px] font-black text-[#2D3350]">카테고리</span>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-transparent text-[11px] font-bold text-gray-400 outline-none cursor-pointer"
        >
          <option value="최신순">최신순</option>
          <option value="좋아요순">좋아요순</option>
        </select>
      </div>

      <div className="overflow-x-auto no-scrollbar pb-1">
        <div className="flex gap-2 w-max px-1">
          {CATEGORIES.map((item) => (
            <button 
              key={item.label}
              onClick={() => setActiveCategory(item.label)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all whitespace-nowrap
                ${activeCategory === item.label 
                  ? 'bg-[#2D3350] text-white shadow-md' 
                  : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}
            >
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}