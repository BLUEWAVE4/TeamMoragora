/**
 * 파일명: JudgingPage.jsx
 * 담당자: 프론트 B 채유진
 * 인라인 판결 결과 표시 (VerdictContent 공통 컴포넌트 사용)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDebate, getVoteTally, getVerdict } from '../../services/api';
import { trackEvent } from '../../services/analytics';
import VerdictContent from '../../components/verdict/VerdictContent';
import confetti from 'canvas-confetti';

// ===== 판결 중 랜덤 메시지 =====
const JUDGING_MESSAGES = [
  "각 AI가 논쟁에 대한 판단을 진행중입니다...",
  "누군가 언성을 높이는 것 같습니다...",
  "고요한 침묵 속에서 표정이 심각해지고 있습니다...",
  "판사들이 서류를 넘기며 깊이 고민하고 있습니다...",
  "치열한 논쟁의 여운이 법정에 감돌고 있습니다...",
  "AI 판사들이 메모를 주고받는 것 같습니다...",
  "결정적인 논점을 발견한 듯 눈빛이 바뀌었습니다...",
  "양측의 주장을 한 줄 한 줄 되짚고 있습니다...",
  "판결문 초안을 작성하기 시작했습니다...",
  "최종 점수를 산정하는 중입니다...",
];

// ===== 타이핑 애니메이션 컴포넌트 =====
const TypingMessage = ({ messages }) => {
  const [currentIndex, setCurrentIndex] = useState(() => Math.floor(Math.random() * messages.length));
  const [displayText, setDisplayText] = useState('');
  const [phase, setPhase] = useState('typing'); // typing | pause | erasing
  const timeoutRef = useRef(null);

  const currentMessage = messages[currentIndex];

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    clearTimer();

    if (phase === 'typing') {
      if (displayText.length < currentMessage.length) {
        timeoutRef.current = setTimeout(() => {
          setDisplayText(currentMessage.slice(0, displayText.length + 1));
        }, 40);
      } else {
        timeoutRef.current = setTimeout(() => setPhase('erasing'), 2500);
      }
    } else if (phase === 'erasing') {
      if (displayText.length > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 25);
      } else {
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * messages.length);
        } while (nextIndex === currentIndex && messages.length > 1);
        setCurrentIndex(nextIndex);
        setPhase('typing');
      }
    }

    return clearTimer;
  }, [displayText, phase, currentMessage, currentIndex, messages, clearTimer]);

  return (
    <p className="text-white/60 text-[15px] italic font-medium tracking-tight h-6">
      {displayText}
      <span className="inline-block w-[2px] h-[14px] bg-white/50 ml-[2px] align-middle animate-pulse" />
    </p>
  );
};

// AI 모델 매핑 (서버 ai_model 값 → UI key)
const MODEL_MAP = {
  'gpt-4o': 'gpt',
  'gemini-2.5-flash': 'gemini',
  'gemini-2.0-flash': 'gemini',
  'gemini': 'gemini',
  'claude-sonnet': 'claude',
  'claude-3.5-sonnet': 'claude',
  'claude': 'claude',
  'grok-3-mini': 'gpt',
  'grok': 'gpt',
};

const ModelStatus = ({ name, nameColor = 'text-white', status, score }) => {
  const isDone = status === 'done';
  const isFailed = status === 'failed';
  const isActive = status === 'active';

  const total = score ? score.a + score.b : 0;
  const pctA = total > 0 ? Math.round((score.a / total) * 100) : 50;
  const pctB = 100 - pctA;
  const isDraw = score && score.a === score.b;
  const aWins = score && score.a > score.b;

  const barClassA = isDraw
    ? 'bg-gradient-to-r from-gray-400 to-gray-500'
    : aWins
      ? 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]'
      : 'bg-gradient-to-r from-gray-500/40 to-gray-500/60';

  const barClassB = isDraw
    ? 'bg-gradient-to-r from-gray-500 to-gray-400'
    : !aWins
      ? 'bg-gradient-to-r from-red-400 via-red-500 to-red-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]'
      : 'bg-gradient-to-r from-gray-500/60 to-gray-500/40';

  return (
    <div className={`p-4 mb-3 rounded-2xl transition-all duration-500 ${
      isDone ? 'bg-white/10' : isFailed ? 'bg-red-900/20' : isActive ? 'bg-white/5 animate-pulse' : 'bg-white/5 opacity-50'
    }`}>
      {/* 모델명 + 상태 (중앙 정렬) */}
      <div className="flex items-center justify-center mb-2">
        {isDone ? (
          <span className={`font-bold text-sm ${nameColor}`}>{name}</span>
        ) : (
          <span className={`font-bold text-sm ${nameColor} opacity-70`}>
            {name}
            <span className="ml-2 text-xs font-bold">
              {isFailed ? (
                <span className="text-red-400">응답 실패</span>
              ) : isActive ? (
                <span className="text-blue-400">분석 중...</span>
              ) : (
                <span className="text-white/30">대기 중</span>
              )}
            </span>
          </span>
        )}
      </div>

      {/* 게이지 바 (완료 시만) */}
      {isDone && score && (
        <div className="relative flex h-7 rounded-full overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-white/15">
          <div
            className={`transition-all duration-700 flex items-center justify-center ${barClassA}`}
            style={{ width: `${pctA}%`, minWidth: '32px' }}
          >
            <span className={`text-xs font-black drop-shadow-md ${isDraw || aWins ? 'text-white' : 'text-white/60'}`}>{score.a}</span>
          </div>
          <div className="w-[2px] bg-white/60 shrink-0" />
          <div
            className={`transition-all duration-700 flex items-center justify-center ${barClassB}`}
            style={{ width: `${pctB}%`, minWidth: '32px' }}
          >
            <span className={`text-xs font-black drop-shadow-md ${isDraw || !aWins ? 'text-white' : 'text-white/60'}`}>{score.b}</span>
          </div>
        </div>
      )}
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
  const [proSide, setProSide] = useState(null);
  const [conSide, setConSide] = useState(null);
  const [verdictData, setVerdictData] = useState(null);

  const confettiFiredRef = useRef(false);

  const fireConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      zIndex: 9999,
      colors: ['#FEE500', '#E63946', '#4285F4', '#10A37F', '#FFFFFF']
    });
  };

  // 판결 완료 감지 시 꽃가루
  useEffect(() => {
    if (isAllDone && !confettiFiredRef.current) {
      fireConfetti();
      confettiFiredRef.current = true;
      trackEvent('verdict_view', { debateId });
    }
  }, [isAllDone]);

  useEffect(() => {
    const initFetch = async () => {
      try {
        const data = await getDebate(debateId);
        setDebateTitle(data.topic || data.title || "주제 없음");
        setProSide(data.pro_side || null);
        setConSide(data.con_side || null);
      } catch (e) {
        console.error(e);
        setDebateTitle("논쟁 주제를 찾을 수 없습니다.");
      }
    };
    initFetch();

    const pollInterval = setInterval(async () => {
      try {
        try {
          const voteResponse = await getVoteTally(debateId);
          const totalVotes = voteResponse.data?.total_votes || voteResponse.total_votes || voteResponse.total || 0;
          setVoteCount(totalVotes);
        } catch (_) {}

        const debateData = await getDebate(debateId);
        const isVotingOrDone = ['voting', 'completed'].includes(debateData.status);

        if (debateData.status === 'arguing') return;

        try {
          const verdictResponse = await getVerdict(debateId);
          if (!verdictResponse) return;

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

          if (isVotingOrDone) {
            Object.keys(newStatus).forEach(k => {
              if (newStatus[k] !== 'done') newStatus[k] = 'failed';
            });
          }

          setJudgeStatus({ ...newStatus });
          setJudgeScores(newScores);

          if (isVotingOrDone && aiJudgments.length > 0) {
            setVerdictData(verdictResponse);
            setIsAllDone(true);
            clearInterval(pollInterval);
          }
        } catch (_) {}
      } catch (error) {}
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
        <div className="flex-1 flex flex-col px-6 pt-16 pb-32 overflow-y-auto">

          {/* ===== 헤더 영역 ===== */}
          <div className="flex flex-col items-center text-center space-y-4 shrink-0">
            <h2 className="text-white text-2xl font-black tracking-tight">
              {isAllDone ? "판결이 완료되었습니다!" : "AI가 판결 중입니다"}
            </h2>
            {isAllDone ? (
              <p className="text-white/60 text-[15px] italic font-medium tracking-tight">
                결과가 도착했습니다. 아래에서 확인하세요!
              </p>
            ) : (
              <TypingMessage messages={JUDGING_MESSAGES} />
            )}
            <p className="text-[13px] text-white/60 font-medium text-center italic line-clamp-2 px-4 mt-1 bg-white/5 py-2 rounded-lg w-full">
              "{debateTitle}"
            </p>
            {(proSide || conSide) && (
              <div className="flex items-center gap-2 text-xs font-bold mt-1">
                <span className="text-blue-300">{proSide || '찬성'}</span>
                <span className="text-white/30">vs</span>
                <span className="text-red-300">{conSide || '반대'}</span>
              </div>
            )}
          </div>

          {/* ===== AI 모델 상태 카드 ===== */}
          <div className="bg-white/5 backdrop-blur-md rounded-[24px] p-5 border border-white/5 mt-8 shrink-0">
            <ModelStatus name="지피티 판결" nameColor="text-gray-900" status={judgeStatus.gpt} score={judgeScores.gpt} />
            <ModelStatus name="제미나이 판결" nameColor="text-blue-400" status={judgeStatus.gemini} score={judgeScores.gemini} />
            <ModelStatus name="클로드 판결" nameColor="text-orange-400" status={judgeStatus.claude} score={judgeScores.claude} />
          </div>

          {/* ===== 시민 투표 현황 (진행 중) ===== */}
          {!isAllDone && (
            <div className="mt-10 shrink-0">
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center gap-1 backdrop-blur-sm">
                <p className="text-[13px] font-bold text-yellow-500/90 tracking-wider">실시간 시민 투표 현황</p>
                <p className="text-3xl font-black text-white tabular-nums">
                  {displayCount.toLocaleString()} / 500명
                </p>
              </div>
              <div className="mt-6">
                <button
                  disabled
                  className="w-full h-[60px] rounded-[18px] font-black text-lg bg-white/10 text-white/20 border border-white/5 cursor-not-allowed"
                >
                  최종 분석 중...
                </button>
              </div>
            </div>
          )}

          {/* ===== 인라인 판결 결과 (완료 시) ===== */}
          {isAllDone && verdictData && (
            <div className="mt-8">
              <VerdictContent verdictData={verdictData} topic={debateTitle} />

              <button
                onClick={() => navigate(`/debate/${debateId}`)}
                className="w-full mt-5 py-4 bg-[#1B2A4A] text-[#D4AF37] rounded-2xl font-bold text-base tracking-wider shadow-lg active:scale-[0.97] transition-transform"
              >
                투표 참여하기
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
