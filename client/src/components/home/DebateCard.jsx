import { Link } from 'react-router-dom';

export default function DebateCard({ feed, formatTime }) {
  // 데이터 구조를 안전하게 추출합니다.
  const topic = feed.debate?.topic || "제목 없는 논쟁";
  const summary = feed.summary || "요약 내용을 불러올 수 없습니다.";
  const category = feed.debate?.category || '일상';
  const creator = feed.debate?.creator?.nickname || "익명";
  
  // 점수 계산 (AI 점수 기준)
  const scoreA = feed.ai_score_a || 0;
  const scoreB = feed.ai_score_b || 0;
  const total = scoreA + scoreB;
  
  // 0명일 때 50%를 기본값으로 설정
  const percentA = total === 0 ? 50 : Math.round((scoreA / total) * 100);

  return (
    <Link 
      to={`/debate/${feed.debate_id}`}
      className="bg-white rounded-[32px] p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-gray-100/50 block hover:shadow-[0_12px_50px_rgba(45,51,80,0.1)] transition-all duration-500 active:scale-[0.98]"
    >
      {/* 🚀 상단: 카테고리 태그 & 작성자/시간 */}
      <div className="flex justify-between items-center mb-5">
        <span className="px-4 py-1.5 bg-[#FFBD43]/10 text-[#FFBD43] text-[10px] font-extrabold rounded-lg uppercase tracking-wider">
          #{category}
        </span>
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-tighter">
          <span>By {creator}</span>
          <span>|</span>
          <span>{formatTime(feed.created_at)}</span>
        </div>
      </div>

      {/* 📋 제목(Topic) */}
      <h3 className="text-xl font-extrabold text-[#2D3350] mb-6 leading-tight break-keep hover:text-[#FFBD43] transition-colors">
        {topic}
      </h3>

      {/* 💡 AI 요약(Summary) 박스 */}
      <div className="bg-[#F8F9FA] rounded-[24px] p-6 mb-8 border border-gray-50 relative">
        <div className="absolute -top-3 left-6 px-2 bg-white text-[9px] font-black text-[#FFBD43]">AI SUMMARY</div>
        <p className="text-[12px] leading-relaxed text-gray-500 font-medium italic">
          "{summary}"
        </p>
      </div>

      {/* 📊 실시간 스코어/투표 프로그레스 바 */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-end px-1">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter opacity-60">SIDE A (AI)</span>
            <span className="text-xl font-extrabold text-blue-600">{scoreA}점</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-red-400 uppercase tracking-tighter opacity-60">SIDE B (AI)</span>
            <span className="text-xl font-extrabold text-red-500">{scoreB}점</span>
          </div>
        </div>
        
        {/* 내부 여백을 준 캡슐 형태 프로그레스 바 */}
        <div className="h-4 w-full bg-gray-100 rounded-full flex overflow-hidden p-1 border border-gray-50">
          <div 
            className="bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out" 
            style={{ width: `${percentA}%` }} 
          />
          <div className="bg-transparent flex-1" />
        </div>
      </div>

      {/* ⬇️ 하단: 참여 유도 */}
      <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center text-[#FFBD43]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-[11px] font-black text-gray-400">실시간 스코어 집계 중</span>
        </div>
        <span className="text-[11px] font-black flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
          판결하러 가기 →
        </span>
      </div>
    </Link>
  );
}