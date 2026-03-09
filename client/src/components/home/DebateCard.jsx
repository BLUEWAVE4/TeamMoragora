import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx'; // 💡 경로가 맞는지 꼭 확인하세요!

export default function DebateCard({ feed, formatTime }) {
  const { user } = useAuth(); // 💡 내 세션 정보 가져오기
  
  if (!feed) return null;

  const debate = feed.debate || {};
  const topic = debate.topic || "제목 없는 논쟁";
  
  // 💡 [실시간 반영 핵심] 
  // 1. 내가 작성한 글인지 확인 (ID 비교)
  const isMe = user && (debate.creator_id === user.id);
  
  // 2. 작성자 닉네임 결정: 나라면 내 세션의 최신 이름을, 아니면 DB에 저장된 이름을 사용
  const creatorNickname = isMe 
    ? (user.user_metadata?.nickname || "김준민짱") 
    : (debate.creator?.nickname || "논쟁마스터");
  
  const categoryMap = {
    'WORK': '직장',
    'DAILY': '일상',
    'SOCIETY': '사회',
    'LOVE': '연애',
    'ECONOMY': '경제'
  };
  const categoryName = categoryMap[debate.category?.toUpperCase()] || debate.category || '일상';

  const scoreA = feed.ai_score_a || 0;
  const scoreB = feed.ai_score_b || 0;
  const total = scoreA + scoreB;
  const percentA = total > 0 ? Math.round((scoreA / total) * 100) : 50;
  const percentB = 100 - percentA;

  return (
    <div className="w-full bg-white border border-gray-200 rounded-[24px] mb-5 overflow-hidden shadow-sm transition-all hover:shadow-md">
      
      {/* 1. 헤더: 유저 정보 */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-white p-[2px]">
              <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-lg shadow-inner font-black text-gray-400">
                {/* 💡 닉네임 첫 글자로 프로필 대체 */}
                {creatorNickname.charAt(0)}
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              {/* 💡 실시간으로 변하는 닉네임 적용 지점 */}
              <span className="text-[15px] font-bold text-[#262626]">{creatorNickname}</span>
              {isMe && <span className="text-[9px] bg-[#2D3350] px-1.5 py-0.5 rounded-full text-white font-black">나</span>}
            </div>
            <span className="text-[12px] text-gray-500 font-medium">{categoryName}</span>
          </div>      
        </div>
        <p className="text-[11px] text-gray-400 font-semibold tracking-tighter">
          {formatTime ? formatTime(feed.created_at) : '2026. 3. 5.'}
        </p>
      </div>

      {/* 2. 본문: 질문 영역 */}
      <div className="px-5 py-2">
        <h3 className="text-[17px] font-normal text-[#262626] leading-relaxed break-keep">
          {topic}
        </h3>
      </div>

      {/* 3. 투표 영역 */}
      <div className="px-5 py-3">
        <div className="relative h-10 w-full bg-gray-50 rounded-xl flex items-center overflow-hidden border border-gray-100 mb-2">
          <div 
            className="h-full bg-blue-100/50 transition-all duration-1000 ease-out border-r border-blue-200" 
            style={{ width: `${percentA}%` }} 
          />
          <div className="absolute inset-0 flex justify-between items-center px-5">
            <div className="flex items-center">
              <span className="text-[13px] font-bold text-blue-600 mr-2 uppercase">찬성</span>
              <span className="text-[16px] font-black text-blue-900">{percentA}%</span>
            </div>
            <div className="flex items-center">
              <span className="text-[16px] font-black text-red-900">{percentB}%</span>
              <span className="text-[13px] font-bold text-red-400 ml-2 uppercase">반대</span>
            </div>
          </div>
        </div>

        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
          <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${percentA}%` }} />
          <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${percentB}%` }} />
        </div>

        <div className="flex justify-between mt-2 px-1 text-[11px] text-gray-400 font-bold tracking-tight">
          <span>{scoreA.toLocaleString()}명 참여</span>
          <span>{scoreB.toLocaleString()}명 참여</span>
        </div>
      </div>

      {/* 4. 하단 액션 바 */}
      <div className="px-5 pt-3 pb-2 flex justify-between items-center">
        <div className="flex gap-4">
          <button className="hover:opacity-60 transition-opacity">
            <svg aria-label="좋아요" fill="#262626" height="24" viewBox="0 0 24 24" width="24">
              <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.194 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.325.427.54.832.617 1.03a4.21 4.21 0 0 1 3.675-1.941l.167-.03z"></path>
            </svg>
          </button>
          <button className="hover:opacity-60 transition-opacity">
            <svg aria-label="댓글" fill="#262626" height="24" viewBox="0 0 24 24" width="24">
              <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </button>
          <button className="hover:opacity-60 transition-opacity flex items-center">
            <svg aria-label="조회" fill="none" stroke="#262626" strokeWidth="2" height="24" viewBox="0 0 24 24" width="24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button className="hover:opacity-60 transition-opacity">
            <svg aria-label="공유" fill="#262626" height="24" viewBox="0 0 24 24" width="24">
              <line fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" x1="22" x2="9.218" y1="3" y2="10.083"></line>
              <polygon fill="none" points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></polygon>
            </svg>
          </button>
        </div>
        <Link 
          to={`/debate/${feed.debate_id}`}
          className="text-[#0095f6] text-[14px] font-bold hover:text-blue-800"
        >
          참여하기
        </Link>
      </div>

      <div className="px-5 pb-5">
        <p className="text-[13px] font-bold text-[#262626] mb-1 leading-none">
          좋아요 {debate.likes_count?.toLocaleString() || '530'}개
        </p>
      </div>
    </div>
  );
}