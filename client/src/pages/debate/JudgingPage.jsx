/**
 * 파일명: JudgingPage.jsx
 * 담당자: 프론트 B 채유진
 * 인라인 판결 결과 표시 (VerdictContent 공통 컴포넌트 사용)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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

// AI 판사 캐릭터 정보
const AI_JUDGES = {
  gpt: { name: '지피티', color: '#4285F4', borderColor: '#000000', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JudgeGPT&skinColor=ffdbb4&top=shortCurly&hairColor=724133&facialHairProbability=0&eyes=default&eyebrows=defaultNatural&mouth=twinkle&clothing=shirtCrewNeck&clothesColor=3c4f5c&accessoriesProbability=0', desc: '다각적 시각의 통찰가' },
  gemini: { name: '제미나이', color: '#10A37F', borderColor: '#4285F4', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JudgeGemini&skinColor=d08b5b&top=dreads01&hairColor=2c1b18&facialHair=beardLight&facialHairProbability=100&facialHairColor=2c1b18&eyes=squint&eyebrows=raisedExcited&mouth=twinkle&clothing=collarAndSweater&clothesColor=25557c&accessories=round&accessoriesProbability=100&accessoriesColor=000000', desc: '분석적이고 정중한 판사' },
  claude: { name: '클로드', color: '#D97706', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JudgeClaude&skinColor=edb98a&top=bigHair&hairColor=c93305&facialHairProbability=0&eyes=happy&eyebrows=upDown&mouth=smile&clothing=hoodie&clothesColor=e6e6e6', desc: '신중하고 공정한 판사' },
};

// 카운트업 애니메이션 훅
const useCountUp = (target, duration = 2000) => {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === null || target === undefined) return;
    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) { setValue(target); return; }
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
      else prevTarget.current = target;
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return value;
};

const ModelCard = ({ judgeKey, status, score }) => {
  const judge = AI_JUDGES[judgeKey];
  const isDone = status === 'done';
  const isFailed = status === 'failed';
  const isActive = status === 'active';
  const displayA = useCountUp(isDone && score ? score.a : null);
  const displayB = useCountUp(isDone && score ? score.b : null);

  return (
    <div className={`flex-1 rounded-2xl overflow-hidden transition-all duration-500 ${
      isDone ? 'bg-white/[0.08] backdrop-blur-sm border border-white/10'
        : isFailed ? 'bg-red-900/15 border border-red-500/20'
        : isActive ? 'bg-white/[0.04] border border-white/5'
        : 'bg-white/[0.03] border border-white/5 opacity-40'
    }`}>
      <div className="p-3 flex flex-col items-center text-center">
        <div
          className={`w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg shrink-0 transition-all duration-500 ${isActive ? 'animate-pulse' : ''}`}
          style={{
            borderColor: isDone ? (judge.borderColor || judge.color) : `${judge.borderColor || judge.color}40`,
            boxShadow: isDone
              ? `0 4px 14px ${judge.borderColor || judge.color}40`
              : 'none'
          }}
        >
          <img src={judge.avatar} alt={judge.name} className="w-full h-full object-cover" />
        </div>
        <span className="text-sm font-serif font-bold text-white mt-2">{judge.name}</span>
        <p className="text-[10px] font-serif text-white/40 truncate w-full">{judge.desc}</p>

        {/* 판결 결과 or 상태 */}
        <div className="mt-2">
          {isDone && score ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-[12px] font-black font-serif tracking-wider">
              <span className={displayA >= displayB ? 'text-emerald-400' : 'text-emerald-400/40'}>{String(displayA).padStart(2, '0')}</span>
              <span className="text-white/30">:</span>
              <span className={displayB >= displayA ? 'text-red-400' : 'text-red-400/40'}>{String(displayB).padStart(2, '0')}</span>
            </span>
          ) : isActive ? (
            <span className="flex items-center justify-center gap-1 text-[11px] text-blue-400 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              분석 중
            </span>
          ) : isFailed ? (
            <span className="text-[11px] text-red-400/80 font-semibold">실패</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default function JudgingPage() {
  const { debateId } = useParams();

  const [judgeStatus, setJudgeStatus] = useState({ gpt: 'active', gemini: 'active', claude: 'active' });
  const [judgeScores, setJudgeScores] = useState({ gpt: null, gemini: null, claude: null });
  const [voteCount, setVoteCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const [isAllDone, setIsAllDone] = useState(false);
  const [debateTitle, setDebateTitle] = useState("데이터를 불러오는 중...");
  const [proSide, setProSide] = useState(null);
  const [conSide, setConSide] = useState(null);
  const [verdictData, setVerdictData] = useState(null);
  const [copied, setCopied] = useState(false);

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
      <div className="relative flex flex-col w-full max-w-md bg-gradient-to-b from-[#1a2744] via-[#1a2744] via-60% to-[#FAFAF5] shadow-2xl overflow-hidden">
        <div className="flex-1 flex flex-col px-6 pt-16 pb-32 overflow-y-auto">

          {/* ===== 헤더 영역 ===== */}
          <div className="flex flex-col items-center text-center space-y-4 shrink-0">
            <h2 className="text-white text-2xl font-serif font-black tracking-tight">
              {isAllDone ? "판결이 완료되었습니다!" : "AI가 판결 중입니다"}
            </h2>
            {isAllDone ? (
              <p className="text-white/60 text-[15px] font-serif italic font-medium tracking-tight">
                결과가 도착했습니다. 아래에서 확인하세요!
              </p>
            ) : (
              <TypingMessage messages={JUDGING_MESSAGES} />
            )}
            <p className="text-[13px] text-white/60 font-serif font-medium text-center italic line-clamp-2 px-4 mt-1 bg-white/5 py-2 rounded-lg w-full">
              "{debateTitle}"
            </p>
            {(proSide || conSide) && (
              <div className="flex items-center gap-2 text-xs font-serif font-bold mt-1">
                <span className="text-emerald-400">{proSide || '찬성'}</span>
                <span className="text-white/30">vs</span>
                <span className="text-red-300">{conSide || '반대'}</span>
              </div>
            )}
          </div>

          {/* ===== AI 판사 카드 ===== */}
          <div className="flex gap-2 mt-8 shrink-0">
            <ModelCard judgeKey="gpt" status={judgeStatus.gpt} score={judgeScores.gpt} />
            <ModelCard judgeKey="gemini" status={judgeStatus.gemini} score={judgeScores.gemini} />
            <ModelCard judgeKey="claude" status={judgeStatus.claude} score={judgeScores.claude} />
          </div>

          {/* ===== 시민 투표 현황 (진행 중) ===== */}
          {!isAllDone && (
            <div className="mt-10 shrink-0">
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center gap-1 backdrop-blur-sm">
                <p className="text-[13px] font-bold text-yellow-500/90 tracking-wider">🗳️ 실시간 시민 투표 현황</p>
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

              {/* ===== 시민 투표 현황 ===== */}
              {(() => {
                const vA = verdictData.debate?.vote_count_a || verdictData.vote_count_a || 0;
                const vB = verdictData.debate?.vote_count_b || verdictData.vote_count_b || 0;
                const total = vA + vB;
                const pA = total > 0 ? Math.round((vA / total) * 100) : 0;
                const pB = total > 0 ? 100 - pA : 0;
                return (
                  <div className="mt-5 bg-gradient-to-b from-surface to-surface-alt rounded-2xl shadow-sm p-5 border border-gold/10">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[14px] font-serif font-bold text-primary">🗳️ 시민 투표 현황</p>
                      <span className="text-[12px] text-primary/40">{total > 0 ? `${total.toLocaleString()}명 참여` : '투표 진행 중'}</span>
                    </div>
                    {total > 0 ? (
                      <>
                        <div className="flex justify-between text-sm font-bold mb-1.5">
                          <span className="text-emerald-600">찬성 {pA}%</span>
                          <span className="text-red-500">반대 {pB}%</span>
                        </div>
                        <div className="h-3 bg-red-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                            style={{ width: `${pA}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-primary/40 mt-1">
                          <span>{vA.toLocaleString()}명</span>
                          <span>{vB.toLocaleString()}명</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-[13px] text-primary/40 font-serif">아직 투표가 없습니다</p>
                        <p className="text-[11px] text-primary/25 mt-1">공유하여 시민 투표를 받아보세요</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <button
                onClick={() => {
                  const url = `${window.location.origin}/debate/${debateId}`;
                  navigator.clipboard.writeText(url).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className={`w-full mt-5 py-4 rounded-xl font-serif font-bold text-base uppercase tracking-wider border-2 shadow-md active:scale-95 transition-all duration-300 ${
                  copied
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20'
                    : 'bg-primary text-gold border-gold hover:bg-gold hover:text-primary hover:shadow-[0_0_15px_rgba(212,175,55,0.5)]'
                }`}
              >
                {copied ? '✓ 링크가 복사되었습니다!' : '판결 공유하기'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
