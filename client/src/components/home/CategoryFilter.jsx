import { useRef, useState } from 'react';

const CATEGORIES = ['전체', '일상', '연애', '직장', '교육', '사회', '정치', '기술', '철학', '문화'];
const SORT_OPTIONS = ['최신순', '좋아요순', '댓글순', '조회순'];

export default function CategoryFilter({ filter, setFilter, sortBy, setSortBy }) {
  const scrollRef = useRef(null);
  const [showSort, setShowSort] = useState(false);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 120, behavior: 'smooth' });
  };

  return (
    <div className="flex items-center gap-2 py-1.5">
      {/* 카테고리 스크롤 영역 */}
      <div className="relative flex-1 min-w-0">
        <div
          ref={scrollRef}
          className="flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth items-center"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-[14px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                filter === cat
                  ? 'bg-[#1B2A4A] text-[#D4AF37]'
                  : 'text-[#1B2A4A]/30 active:text-[#1B2A4A]/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 구분선 */}
      <div className="w-px h-5 bg-[#1B2A4A]/10 flex-shrink-0" />

      {/* 정렬 드롭다운 */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowSort(!showSort)}
          className="text-[14px] font-bold text-[#1B2A4A]/60 whitespace-nowrap px-2"
        >
          {sortBy} ▾
        </button>
        {showSort && (
          <>
            <div className="fixed inset-0 z-[99]" onClick={() => setShowSort(false)} />
            <div className="absolute right-0 top-8 w-28 bg-white shadow-xl rounded-xl p-1 z-[100] border border-[#1B2A4A]/8">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setSortBy(opt); setShowSort(false); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-[14px] font-bold transition-all ${
                    sortBy === opt ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'text-[#1B2A4A]/40 active:text-[#1B2A4A]/60'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
