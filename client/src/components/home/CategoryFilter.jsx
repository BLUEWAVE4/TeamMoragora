export default function CategoryFilter({ filter, setFilter }) {
  const categories = [
    { name: '전체', key: '전체', icon: '🌐' },
    { name: '일상', key: 'daily', icon: '🏠' },
    { name: '연애', key: 'love', icon: '❤️' },
    { name: '음식', key: 'food', icon: '🍱' },
    { name: '직장', key: 'work', icon: '🏢' }
  ];

  return (
    <div className="py-6 overflow-hidden border-b border-gray-50/50">
      <div className="flex gap-3 px-6 overflow-x-auto no-scrollbar scroll-smooth">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-bold whitespace-nowrap transition-all ${
              filter === cat.key
                ? 'bg-[#2D3350] text-white shadow-lg'
                : 'bg-white text-gray-500 border border-gray-100 shadow-sm'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}