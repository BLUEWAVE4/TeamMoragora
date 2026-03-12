/**
 * 파일명: JudgingPage.jsx
 * 담당자: 프론트 B 채유진
 * 디자인: 유진 님의 오리지널 스타일 (그라데이션 & 화이트 포인트) 유지
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDebate, getVoteTally, getVerdict } from '../../services/api';
import { trackEvent } from '../../services/analytics';
import VerdictDetailModal from '../VerdictDetailModal';

const ModelStatus = ({ name, color, status }) => {
  const isDone = status === 'done';
  const isActive = status === 'active';

  return (
    <div className={`flex items-center justify-between p-4 mb-3 rounded-2xl transition-all duration-500 ${
      isDone ? 'bg-white/10' : isActive ? 'bg-white/5 animate-pulse' : 'bg-white/5 opacity-50'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color} ${isActive ? 'shadow-[0_0_12px_rgba(255,255,255,0.5)]' : ''}`} />
        <span className={`font-bold ${isDone ? 'text-white' : 'text-white/70'}`}>{name}</span>
      </div>
      <div className="text-sm font-bold">
        {isDone ? (
          <span className="text-green-400 flex items-center gap-1 font-bold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
            완료
          </span>
        ) : isActive ? (
          <span className="text-blue-400 font-bold">분석 중...</span>
        ) : (
          <span className="text-white/30 font-bold">대기 중</span>
        )}
      </div>
    </div>
  );
};

export default function JudgingPage() {
  const { debateId } = useParams();
  const navigate = useNavigate();
  
  const [judgeStatus, setJudgeStatus] = useState({ gpt: 'active', gemini: 'waiting', claude: 'waiting' });
  const [voteCount, setVoteCount] = useState(0); 
  const [displayCount, setDisplayCount] = useState(0);
  const [isAllDone, setIsAllDone] = useState(false);
  const [debateTitle, setDebateTitle] = useState("데이터를 불러오는 중...");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verdictData, setVerdictData] = useState(null);

  useEffect(() => {
    const initFetch = async () => {
      try {
        const data = await getDebate(debateId);
        // CreateDebatePage에서 topic으로 저장했으므로 topic 우선 참조
        setDebateTitle(data.topic || data.title || "주제 없음");
      } catch (e) { 
        console.error(e); 
        setDebateTitle("논쟁 주제를 찾을 수 없습니다.");
      }
    };
    initFetch();

    const pollInterval = setInterval(async () => {
      try {
        // 투표 현황 업데이트
        const voteResponse = await getVoteTally(debateId);
        const totalVotes = voteResponse.data?.total_votes || voteResponse.total_votes || 0;
        setVoteCount(totalVotes);

        // 판결 결과 체크
        const verdictResponse = await getVerdict(debateId);
        if (verdictResponse && verdictResponse.winner_side) {
          setVerdictData(verdictResponse);
          setJudgeStatus({ gpt: 'done', gemini: 'done', claude: 'done' });
          setIsAllDone(true);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.log("판결 분석 진행 중...");
      }
    }, 5000); 

    return () => clearInterval(pollInterval);
  }, [debateId]);

  useEffect(() => {
    if (displayCount < voteCount) {
      const timer = setTimeout(() => {
        setDisplayCount(prev => prev + 1);
      }, 30); 
      return () => clearTimeout(timer);
    }
  }, [displayCount, voteCount]);

  return (
    <div className="fixed inset-0 flex justify-center bg-[#FAFAF5] z-50">
      <div className="relative flex flex-col w-full max-w-md bg-gradient-to-b from-[#1a2744] via-[#435479] to-[#ffffff] shadow-2xl overflow-hidden">
        <div className="flex-1 flex flex-col justify-between px-6 pt-24 pb-32 overflow-y-auto">
          
          <div className="flex flex-col items-center text-center space-y-4 shrink-0">
            <div className="text-5xl mb-2 animate-bounce">⚖️</div>
            <h2 className="text-white text-2xl font-black tracking-tight">AI가 판결 중입니다</h2>
            <p className="text-white/60 text-[15px] italic font-medium tracking-tight">실시간 데이터를 확인하고 있습니다...</p>
            <p className="text-[13px] text-white/60 font-medium text-center italic line-clamp-2 px-4 mt-1 bg-white/5 py-2 rounded-lg w-full">
              "{debateTitle}"
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-[24px] p-5 border border-white/5 mt-8 shrink-0">
            <ModelStatus name="Judge G (GPT-4o)" color="bg-[#10A37F]" status={judgeStatus.gpt} />
            <ModelStatus name="Judge M (Gemini 2.0)" color="bg-[#4285F4]" status={judgeStatus.gemini} />
            <ModelStatus name="Judge C (Claude 3.5)" color="bg-[#D97706]" status={judgeStatus.claude} />
          </div>

          <div className="mt-10 space-y-6 shrink-0">
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center gap-1 backdrop-blur-sm">
              <p className="text-[13px] font-bold text-yellow-500/90 tracking-wider">🗳️ 실시간 시민 투표 현황</p>
              <p className="text-3xl font-black text-white tabular-nums">
                {displayCount.toLocaleString()} / 500명
              </p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => { trackEvent('verdict_view', { debateId }); setIsModalOpen(true); }}
                disabled={!isAllDone}
                className={`w-full h-[60px] rounded-[18px] font-black text-lg transition-all duration-500 transform active:scale-95 shadow-xl
                  ${isAllDone ? 'bg-[#E63946] text-white cursor-pointer' : 'bg-white/10 text-white/20 border border-white/5 cursor-not-allowed'}`}
              >
                {isAllDone ? "판결 결과 보기" : "최종 분석 중..."}
              </button>
            </div>
          </div>
        </div>

        {isModalOpen && (
          <VerdictDetailModal 
            selectedVerdict={verdictData} 
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}