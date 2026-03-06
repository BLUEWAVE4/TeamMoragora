import { Link } from 'react-router-dom';

export default function DebateCard({ feed, formatTime }) {
  const topic = feed.debate?.topic || "제목 없는 논쟁";
  const category = feed.debate?.category || '일상';
  const creator = feed.debate?.creator?.nickname || "논쟁마스터";
  
  const scoreA = feed.ai_score_a || 50;
  const scoreB = feed.ai_score_b || 50;
  const total = scoreA + scoreB;
  const percentA = Math.round((scoreA / total) * 100);

  return (
    <div className="bg-white rounded-[32px] p-7 shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-gray-50 mb-4 transition-all hover:shadow-md">
      {/* 작성자 정보 영역 */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">👤</div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-gray-700">{creator}</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-500 text-[10px] font-bold rounded-md w-fit mt-1">
              {category === 'work' ? '직장' : category}
            </span>
          </div>
        </div>
        <span className="text-[11px] font-bold text-gray-300">{formatTime(feed.created_at)}</span>
      </div>

      {/* 질문 제목 */}
      <h3 className="text-[18px] font-extrabold text-[#2D3350] mb-3 leading-snug">
        {topic}
      </h3>
      
      {/* 질문 상세/요약 (AI SUMMARY) */}
      <p className="text-[13px] text-gray-400 mb-6 font-medium leading-relaxed">
        {feed.summary}
      </p>

      {/* 실시간 투표 현황 바 */}
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex justify-between text-[10px] font-black uppercase">
          <span className="text-teal-500">찬성 {percentA}%</span>
          <span className="text-rose-400">반대 {100 - percentA}%</span>
        </div>
        <div className="h-2 w-full bg-gray-50 rounded-full flex overflow-hidden">
          <div className="bg-teal-400 transition-all duration-1000" style={{ width: `${percentA}%` }} />
          <div className="bg-rose-300 flex-1" />
        </div>
        <div className="flex justify-between text-[10px] text-gray-300 font-bold mt-1 tracking-tighter">
          <span>{scoreA}명</span>
          <span>{scoreB}명</span>
        </div>
      </div>

      {/* 하단 반응 및 참여 버튼 */}
      <div className="flex justify-between items-center border-t border-gray-50 pt-5">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1.5 text-gray-400 font-bold text-xs">
            <span className="text-rose-500 text-lg">❤️</span> 530
          </div>
          <div className="flex items-center gap-1.5 text-gray-400 font-bold text-xs">
            <span className="text-lg">💬</span> 142
          </div>
        </div>
        <Link 
          to={`/debate/${feed.debate_id}`}
          className="bg-[#FF6B6B] text-white px-5 py-2.5 rounded-2xl text-[13px] font-black shadow-lg shadow-rose-100 active:scale-95 transition-all"
        >
          참여하기
        </Link>
      </div>
    </div>
  );
}