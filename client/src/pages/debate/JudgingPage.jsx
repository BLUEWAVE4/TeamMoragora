import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDebate, getVoteTally, getVerdict } from '../../services/api';

/**
 * 🤖 ModelStatus: 개별 AI 판사의 진행 상태를 표시하는 컴포넌트
 */
const ModelStatus = ({ name, color, status }) => {
  const isDone = status === 'done';
  const isActive = status === 'active';

  return (
    <div className={`flex items-center justify-between p-4 mb-3 rounded-2xl transition-all duration-500 ${
      isDone ? 'bg-white/10' : isActive ? 'bg-white/5 animate-pulse' : 'bg-white/5 opacity-50'
    }`}>
      <div className="flex items-center gap-3">
        {/* 상태별 불빛 효과 */}
        <div className={`w-3 h-3 rounded-full ${color} ${isActive ? 'shadow-[0_0_12px_rgba(255,255,255,0.5)]' : ''}`} />
        <span className={`font-bold ${isDone ? 'text-white' : 'text-white/70'}`}>{name}</span>
      </div>
      <div className="text-sm font-bold">
        {isDone ? (
          <span className="text-green-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
            완료
          </span>
        ) : isActive ? (
          <span className="text-blue-400 font-medium">분석 중...</span>
        ) : (
          <span className="text-white/30">대기 중</span>
        )}
      </div>
    </div>
  );
};

export default function JudgingPage() {
  const { debateId } = useParams();
  const navigate = useNavigate();
  
  // 1. 상태 관리
  const [judgeStatus, setJudgeStatus] = useState({ gpt: 'active', gemini: 'waiting', claude: 'waiting' });
  const [voteCount, setVoteCount] = useState(0); 
  const [displayCount, setDisplayCount] = useState(0);
  const [isAllDone, setIsAllDone] = useState(false);
  const [debateTitle, setDebateTitle] = useState("데이터를 불러오는 중...");

  useEffect(() => {
    // 초기 1회 실행: 논쟁 제목 가져오기
    const initFetch = async () => {
      try {
        const data = await getDebate(debateId);
        setDebateTitle(data.title);
      } catch (e) { 
        console.error("논쟁 정보를 가져오는데 실패했습니다:", e); 
      }
    };
    initFetch();

    // 2. 실시간 데이터 폴링 (5초마다 실행)
    const pollInterval = setInterval(async () => {
      try {
        // [작업 1] 실제 투표수 업데이트
        const voteResponse = await getVoteTally(debateId);
        // 서버 응답 구조가 { data: { total_votes: ... } } 라고 가정할 때
        setVoteCount(voteResponse.data?.total_votes || 0);

        // [작업 2] AI 판결 완료 여부 확인
        const verdictResponse = await getVerdict(debateId);
        
        // 데이터가 있고 판결 결과(winner_side)가 존재하면 완료 처리
        if (verdictResponse && verdictResponse.winner_side) {
          setJudgeStatus({ gpt: 'done', gemini: 'done', claude: 'done' });
          setIsAllDone(true);
          clearInterval(pollInterval); // 판결 완료 시 폴링 중단
        }
      } catch (error) {
        // 404 에러 등은 아직 판결 전이라는 뜻이므로 무시하고 진행
        console.log("판결 분석 진행 중...");
      }
    }, 5000); 

    return () => clearInterval(pollInterval); // 페이지 이탈 시 메모리 정리
  }, [debateId]);

  useEffect(() => {
    if (displayCount < voteCount) {
      const timer = setTimeout(() => {
        setDisplayCount(prev => prev + 1); // 1씩 증가하며 실제 voteCount를 따라갑니다
      }, 30); 
      return () => clearTimeout(timer);
    }
  }, [displayCount, voteCount]);

  return (
    <div className="fixed inset-0 flex justify-center bg-[#FAFAF5]">
      <div className="relative flex flex-col w-full max-w-md bg-gradient-to-b from-[#1a2744] via-[#435479] to-[#ffffff] shadow-2xl overflow-hidden">
        <div className="flex-1 flex flex-col justify-between px-6 pt-32 pb-40">
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="text-5xl mb-2">⚖️</div>
            <h2 className="text-white text-2xl font-black">AI가 판결 중입니다</h2>
            <p className="text-white/60 text-[15px] italic font-medium">실시간 데이터를 확인하고 있습니다...</p>
            <p className="text-[13px] text-black/80 font-medium text-center italic line-clamp-1 px-4">
              "{debateTitle}"
            </p>
          </div>

          {/* AI 판사 리스트 카드 */}
          <div className="bg-white/5 backdrop-blur-md rounded-[24px] p-5 border border-white/5 mt-8">
            <ModelStatus name="Judge G (GPT-4o)" color="bg-[#10A37F]" status={judgeStatus.gpt} />
            <ModelStatus name="Judge M (Gemini 1.5)" color="bg-[#4285F4]" status={judgeStatus.gemini} />
            <ModelStatus name="Judge C (Claude 3.5)" color="bg-[#D97706]" status={judgeStatus.claude} />
          </div>

          <div className="mt-10 space-y-6">
            {/* 실시간 투표 현황 UI */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center gap-1">
              <p className="text-[13px] font-bold text-yellow-500/90">🗳️ 실시간 시민 투표 현황</p>
              <p className="text-3xl font-black text-white tabular-nums">
                {voteCount.toLocaleString()} / 500명
              </p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => navigate(`/moragora/${debateId}`)} 
                disabled={!isAllDone}
                className={`w-full h-[60px] rounded-[18px] font-black text-lg transition-all duration-500
                  ${isAllDone 
                    ? 'bg-[#E63946] text-white shadow-[0_10px_25px_rgba(230,57,70,0.4)]' 
                    : 'bg-white/10 text-white/20 border border-white/5 cursor-not-allowed'
                  }`}
              >
                {isAllDone ? "판결 결과 보기" : "최종 분석 중..."}
              </button>
              

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}