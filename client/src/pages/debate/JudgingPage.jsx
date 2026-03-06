import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ModelStatus = ({ name, color, status, time }) => {
  const isDone = status === 'done';
  const isActive = status === 'active';
  return (
    <div className={`w-full mb-4 transition-opacity ${status === 'waiting' ? 'opacity-40' : 'opacity-100'}`}>
      <div className="flex justify-between items-center mb-1.5 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${color}`} />
          <span className="text-[13px] font-bold text-[#1a2744]">{name}</span>
        </div>
        {isDone && <span className="text-[10px] text-gray-500 font-medium">✅ 완료 {time}s</span>}
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-[2000ms] ${isDone ? 'w-full' : isActive ? 'w-[60%]' : 'w-0'}`} />
      </div>
    </div>
  );
};

export default function JudgingPage() {
  const { debateId } = useParams();
  const navigate = useNavigate();
  const [judgeStatus, setJudgeStatus] = useState({ gpt: 'active', gemini: 'waiting', claude: 'waiting' });
  
  // 1. 모든 애니메이션이 실제로 끝났는지 확인하는 상태 추가
  const [isAllDone, setIsAllDone] = useState(false);

  useEffect(() => {
    // GPT 완료 -> Gemini 시작
    const t1 = setTimeout(() => setJudgeStatus(p => ({ ...p, gpt: 'done', gemini: 'active' })), 3200);
    // Gemini 완료 -> Claude 시작
    const t2 = setTimeout(() => setJudgeStatus(p => ({ ...p, gemini: 'done', claude: 'active' })), 6000);
    // Claude 시작 시점
    const t3 = setTimeout(() => setJudgeStatus(p => ({ ...p, claude: 'done' })), 8500);
    
    // 2. Claude의 게이지가 다 차는 시점(약 2초 후)에 버튼 활성화
    const t4 = setTimeout(() => setIsAllDone(true), 10500); 

    return () => { 
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); 
    };
  }, []);

  return (
    <div className="fixed inset-0 flex justify-center bg-[#FAFAF5]">
      <div className="relative w-full max-w-sm bg-[#1a2744] h-full flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col justify-between px-6 pt-20 pb-10">
          
          {/* ... 상단 및 중앙 카드 영역 (동일) ... */}
          <div className="bg-white rounded-[24px] p-6 shadow-2xl flex-none">
            <ModelStatus name="Judge G (GPT-4o)" color="bg-[#10A37F]" status={judgeStatus.gpt} time="3.2" />
            <ModelStatus name="Judge M (Gemini 1.5)" color="bg-[#4285F4]" status={judgeStatus.gemini} time="2.8" />
            <ModelStatus name="Judge C (Claude 3.5)" color="bg-[#D97706]" status={judgeStatus.claude} time="2.5" />
            
            {/* 3. 투표 현황도 Claude가 완전히 끝난 시점에 등장 */}
            <div className={`mt-4 pt-4 border-t border-gray-100 transition-opacity duration-700 ${isAllDone ? 'opacity-100' : 'opacity-0'}`}>
              <div className="bg-blue-50 p-3 rounded-xl flex justify-between items-center">
                <div className="text-[#1a2744]">
                  <p className="text-[10px] font-bold italic">🗳️ 시민 투표 진행 중</p>
                  <p className="text-lg font-black tabular-nums">47 / 500명</p>
                </div>
                <span className="text-[9px] text-blue-400 font-medium animate-pulse">실시간 집계</span>
              </div>
            </div>
          </div>

          {/* 하단 섹션: 이제 isAllDone 상태로 버튼 제어 */}
          <div className="w-full flex flex-col items-center gap-4 flex-none">
            <button 
              onClick={() => navigate(`/debate/${debateId}`)}
              disabled={!isAllDone}
              className={`w-full h-[56px] rounded-[16px] font-bold text-lg transition-all duration-500 ${
                isAllDone 
                  ? 'bg-[#E63946] text-white shadow-xl shadow-red-500/30 active:scale-95' 
                  : 'bg-white/10 text-white/20 cursor-not-allowed'
              }`}
            >
              {isAllDone ? "➡️ 판결 결과 보기" : "🔎 분석 중..."}
            </button>
            <p className="text-[11px] text-blue-200/30 italic text-center px-4 line-clamp-1">
              "탕수육 찍먹 vs 부먹, 진정한 승자는?"
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}