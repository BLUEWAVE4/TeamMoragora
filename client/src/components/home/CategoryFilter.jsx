export default function CategoryFilter({ filter, setFilter }) {
  // 서버 데이터와 매칭되는 영문 키와 한글 이름을 가집니다.
  const categories = [
    { name: '전체', key: '전체' },
    { name: '직장', key: 'work' },
    { name: '연애', key: 'love' },
    { name: '일상', key: 'daily' },
    { name: '음식', key: 'food' },
    { name: '취미', key: 'hobby' } // 예시 카테고리 추가
  ];

  return (
    <div className="py-4 border-b border-gray-50/50">
      <div 
        className="flex gap-2.5 px-6 min-w-max overflow-x-auto no-scrollbar scroll-smooth" 
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-5 py-2.5 rounded-[20px] text-[13px] font-extrabold transition-all duration-300 ${
              filter === cat.key
                ? 'bg-[#2D3350] text-white shadow-lg'
                : 'bg-white text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      {/* Tailwind에서 스크롤바 숨기기 (tailwind.config.js에 추가하는 것이 좋지만, 임시로 style 적용) */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}