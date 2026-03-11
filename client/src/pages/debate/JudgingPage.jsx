/**
 * 파일명: JudgingPage.jsx
 * 담당자: 프론트 B 채유진
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDebate, getVoteTally, getVerdict } from '../../services/api';
import { trackEvent } from '../../services/analytics';
import VerdictDetailModal from '../VerdictDetailModal';

// AI 모델 매핑 (서버 ai_model 값 → UI key)
const MODEL_MAP = {
  'gpt-4o': 'gpt',
  'gemini-2.0-flash': 'gemini',
  'gemini': 'gemini',
  'claude-3.5-sonnet': 'claude',
  'claude': 'claude',
  'grok': 'gpt', // fallback은 gpt 슬롯에 표시
};

const ModelStatus = ({ name, color, status, score }) => {
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
            {score ? `${score.a} : ${score.b}` : '완료'}
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

  const [judgeStatus, setJudgeStatus] = useState({ gpt: 'active', gemini: 'active', claude: 'active' });
  const [judgeScores, setJudgeScores] = useState({ gpt: null, gemini: null, claude: null });
  const [voteCount, setVoteCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const [isAllDone, setIsAllDone] = useState(false);
  const [debateTitle, setDebateTitle] = useState("데이터를 불러오는 중...");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verdictData, setVerdictData] = useState(null);
  const doneModelsRef = useRef(new Set());

  useEffect(() => {
    const initFetch = async () => {
      try {
        const data = await getDebate(debateId);
        setDebateTitle(data.topic || data.title || "주제 없음");
      } catch (e) {
        console.error(e);
        setDebateTitle("논쟁 주제를 찾을 수 없습니다.");
      }
    };
    initFetch();

    const pollInterval = setInterval(async () => {
      try {
        // 투표 현황 업데이트 (404 무시)
        try {
          const voteResponse = await getVoteTally(debateId);
          const totalVotes = voteResponse.data?.total_votes || voteResponse.total_votes || voteResponse.total || 0;
          setVoteCount(totalVotes);
        } catch (_) { /* 투표 데이터 없을 수 있음 */ }

        // debate status 확인 → judging이면 아직 AI 처리 중이므로 verdict 호출 불필요
        const debateData = await getDebate(debateId);
        if (debateData.status === 'judging' || debateData.status === 'arguing') {
          // AI가 아직 처리 중 — verdict 폴링 스킵 (불필요한 404 방지)
          return;
        }

        // voting/closed 상태 = 판결 완료 → verdict 조회
        const verdictResponse = await getVerdict(debateId);
        if (verdictResponse && verdictResponse.winner_side) {
          // ai_judgments에서 완료된 모델 확인
          const aiJudgments = verdictResponse.ai_judgments || [];
          const newStatus = { gpt: 'active', gemini: 'active', claude: 'active' };
          const newScores = { gpt: null, gemini: null, claude: null };

          aiJudgments.forEach((j) => {
            const key = MODEL_MAP[j.ai_model] || MODEL_MAP[j.ai_model?.split('-')[0]];
            if (key) {
              newStatus[key] = 'done';
              newScores[key] = { a: j.score_a, b: j.score_b };
            }
          });

          setJudgeStatus(newStatus);
          setJudgeScores(newScores);

          // 모든 모델 완료 확인 (최소 1개 이상 + winner_side 존재)
          const doneCount = Object.values(newStatus).filter(s => s === 'done').length;
          if (doneCount >= aiJudgments.length && aiJudgments.length > 0) {
            Object.keys(newStatus).forEach(k => { newStatus[k] = 'done'; });
            setJudgeStatus({ ...newStatus });
            setVerdictData(verdictResponse);
            setIsAllDone(true);
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        // 네트워크 에러 등 — 무시하고 다음 폴링에서 재시도
      }
    }, 3000);

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
            <p className="text-white/60 text-[15px] italic font-medium tracking-tight">3개 AI 모델이 동시에 분석하고 있습니다...</p>
            <p className="text-[13px] text-white/60 font-medium text-center italic line-clamp-2 px-4 mt-1 bg-white/5 py-2 rounded-lg w-full">
              "{debateTitle}"
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-[24px] p-5 border border-white/5 mt-8 shrink-0">
            <ModelStatus name="Judge G (GPT-4o)" color="bg-[#10A37F]" status={judgeStatus.gpt} score={judgeScores.gpt} />
            <ModelStatus name="Judge M (Gemini 2.0)" color="bg-[#4285F4]" status={judgeStatus.gemini} score={judgeScores.gemini} />
            <ModelStatus name="Judge C (Claude 3.5)" color="bg-[#D97706]" status={judgeStatus.claude} score={judgeScores.claude} />
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
