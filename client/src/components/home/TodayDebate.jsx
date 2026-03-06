export default function TodayDebate({ item }) {
  if (!item) return null;

  return (
    <div className="px-6 pt-6">
      <div className="relative w-full h-[200px] bg-[#2D3350] bg-gradient-to-br from-[#2D3350] to-[#1E233A] rounded-[40px] overflow-hidden px-10 py-8 flex flex-col justify-center text-white shadow-2xl shadow-[#2D3350]/20 border border-[#424A6D]">
        {/* 장식용 아이콘 */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/3 rounded-full blur-2xl" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black text-[#FFBD43] uppercase tracking-widest bg-[#FFBD43]/10 px-2.5 py-1 rounded-full">🔥 Hot Debate</span>
          </div>
          
          <h2 className="text-2xl font-black leading-tight break-keep">
            {item.debate?.topic || "오늘의 주요 논쟁"}
          </h2>
          
          <div className="flex items-center gap-2.5 pt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[12px] font-bold text-gray-400 opacity-80">AI 판결 진행 중...</span>
          </div>
        </div>
      </div>
    </div>
  );
}