import { useRef } from 'react';

export default function CategoryFilter({ filter, setFilter }) {
  const scrollRef = useRef(null);

  const categories = [
    {
      name: '전체', key: '전체',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
      )
    },
    {
      name: '일상', key: '일상',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      )
    },
    {
      name: '연애', key: '연애',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      )
    },
    {
      name: '직장', key: '직장',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      )
    },
    {
      name: '교육', key: '교육',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      )
    },
    {
      name: '사회', key: '사회',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )
    },
    {
      name: '정치', key: '정치',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/>
        </svg>
      )
    },
    {
      name: '기술', key: '기술',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
        </svg>
      )
    },
    {
      name: '철학', key: '철학',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      )
    },
    {
      name: '문화', key: '문화',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
        </svg>
      )
    }
  ];

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 150, behavior: 'smooth' });
  };

  return (
    <div className="relative py-2">
      {/* 좌측 화살표 */}
      <button
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/80 border border-[#1B2A4A]/10 flex items-center justify-center shadow-sm hover:bg-white active:scale-90 transition-all"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1B2A4A" strokeWidth="3" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full items-center px-8"
      >
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-serif font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              filter === cat.key
                ? 'bg-[#1B2A4A] text-[#D4AF37] shadow-sm'
                : 'bg-white/60 text-[#1B2A4A]/35 hover:text-[#1B2A4A]/50'
            }`}
          >
            <span className={filter === cat.key ? "text-[#D4AF37]" : "text-[#1B2A4A]/25"}>
              {cat.icon}
            </span>
            <span>{cat.name}</span>
          </button>
        ))}
        <div className="min-w-[8px] h-1 flex-shrink-0" />
      </div>

      {/* 우측 화살표 */}
      <button
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/80 border border-[#1B2A4A]/10 flex items-center justify-center shadow-sm hover:bg-white active:scale-90 transition-all"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1B2A4A" strokeWidth="3" strokeLinecap="round"><polyline points="9 6 15 12 9 18"/></svg>
      </button>
    </div>
  );
}
