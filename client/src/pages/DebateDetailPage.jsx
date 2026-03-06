import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function DebateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 1. 초기 투표 데이터 (실제 서비스에선 서버에서 받아올 데이터)
  const [votesA, setVotesA] = useState(1247);
  const [votesB, setVotesB] = useState(852);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedSide, setSelectedSide] = useState(null);

  // 2. 실시간 퍼센트 계산
  const total = votesA + votesB;
  const perA = ((votesA / total) * 100).toFixed(1);
  const perB = ((votesB / total) * 100).toFixed(1);

  // 3. 투표 핸들러 (애니메이션 트리거)
  const handleVote = (side) => {
    if (hasVoted) return; // 중복 클릭 방지

    setSelectedSide(side);
    if (side === 'A') setVotesA(prev => prev + 1);
    else setVotesB(prev => prev + 1);

    // 즉시 투표 완료 상태로 전환하여 애니메이션 실행
    setHasVoted(true);
  };

  return (
    <div className="flex flex-col gap-6 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-md mx-auto">
      {/* 상단 헤더 */}
      <div className="flex justify-between items-center py-4 px-2">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-md text-xl active:scale-90 transition-transform"
        >
          ←
        </button>
        <span className="font-black text-[#2D3350] tracking-tighter">실시간 판결 중</span>
        <div className="w-10" /> 
      </div>

      {/* 메인 투표 카드 */}
      <div className="bg-[#2D3350] rounded-[3.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="flex justify-center mb-6">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all duration-500 ${hasVoted ? 'bg-[#00C193] animate-bounce' : 'bg-[#FF5C5C] animate-pulse'}`}>
            {hasVoted ? "판결 완료" : "LIVE DEBATE"}
          </span>
        </div>
        
        <h1 className="text-2xl font-black text-center leading-snug mb-12">
          "재택근무가 사무실 근무보다<br />생산적인가?"
        </h1>

        <div className="flex flex-col gap-5">
          {/* A측 버튼: 찬성 */}
          <button 
            onClick={() => handleVote('A')}
            disabled={hasVoted}
            className={`group relative w-full py-7 rounded-[2rem] border transition-all duration-700 overflow-hidden active:scale-[0.95]
              ${hasVoted 
                ? (selectedSide === 'A' ? 'border-[#00C193]' : 'border-white/5 opacity-40') 
                : 'bg-white/5 border-white/10 hover:border-[#00C193]'}`}
          >
            <div className="flex justify-between px-8 items-center relative z-20">
              <span className="font-bold text-lg">A측 찬성</span>
              <span className={`font-black text-2xl transition-all duration-1000 ${hasVoted ? 'scale-110 opacity-100' : 'opacity-30'}`}>
                {hasVoted ? `${perA}%` : 'VS'}
              </span>
            </div>
            {/* 게이지 바 */}
            <div 
              className="absolute top-0 left-0 h-full bg-[#00C193] transition-all duration-[1500ms] ease-out opacity-40" 
              style={{ width: hasVoted ? `${perA}%` : '0%' }} 
            />
          </button>

          {/* B측 버튼: 반대 */}
          <button 
            onClick={() => handleVote('B')}
            disabled={hasVoted}
            className={`group relative w-full py-7 rounded-[2rem] border transition-all duration-700 overflow-hidden active:scale-[0.95]
              ${hasVoted 
                ? (selectedSide === 'B' ? 'border-[#FF5C5C]' : 'border-white/5 opacity-40') 
                : 'bg-white/5 border-white/10 hover:border-[#FF5C5C]'}`}
          >
            <div className="flex justify-between px-8 items-center relative z-20">
              <span className="font-bold text-lg">B측 반대</span>
              <span className={`font-black text-2xl transition-all duration-1000 ${hasVoted ? 'scale-110 opacity-100' : 'opacity-30'}`}>
                {hasVoted ? `${perB}%` : 'VS'}
              </span>
            </div>
            {/* 게이지 바 */}
            <div 
              className="absolute top-0 left-0 h-full bg-[#FF5C5C] transition-all duration-[1500ms] ease-out opacity-40" 
              style={{ width: hasVoted ? `${perB}%` : '0%' }} 
            />
          </button>
        </div>

        <p className="text-center text-gray-400 text-[11px] mt-8">
           현재 총 <span className="text-white font-bold">{total.toLocaleString()}</span>명이 판결에 참여했습니다
        </p>
      </div>

      {/* 하단 데이터 카드 */}
      <div className="grid grid-cols-2 gap-4 px-2">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex flex-col items-center">
          <span className="text-gray-400 text-[10px] font-black mb-1 uppercase tracking-tighter">AI Prediction</span>
          <span className="text-[#2D3350] font-black text-sm text-center italic">"자율성이 효율성을 만든다"</span>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex flex-col items-center">
          <span className="text-gray-400 text-[10px] font-black mb-1 uppercase tracking-tighter">End Time</span>
          <span className="text-[#2D3350] font-black text-sm text-center">18:42:00 남음</span>
        </div>
      </div>
    </div>
  );
}