/**
 * 파일명: JudgingPage.jsx
 * 담당자: 프론트 B 채유진
 * 인라인 판결 결과 표시 (VerdictContent 공통 컴포넌트 사용)
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDebate, getVoteTally, getVerdict, getArguments } from '../../services/api';
import { trackEvent } from '../../services/analytics';
import VerdictContent from '../../components/verdict/VerdictContent';
import { AI_JUDGES, MODEL_MAP } from '../../constants/judges';
import confetti from 'canvas-confetti';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

// ===== 분석 중 랜덤 메시지 =====
const ANALYSIS_MESSAGES = [
  "심각한 표정을 짓는 중..",
  "고민에 빠지는 중..",
  "서류를 넘기는 중..",
  "메모를 끄적이는 중..",
  "눈빛이 날카로워지는 중..",
  "깊은 생각에 잠기는 중..",
  "양측 주장을 되짚는 중..",
  "결정적 논점을 찾는 중..",
  "판결문 초안을 쓰는 중..",
  "점수를 매기는 중..",
  "한숨을 내쉬는 중..",
  "표정이 굳어지는 중..",
];

// 타이핑 애니메이션 훅
const useTypingMessage = (messages, typingSpeed = 60, pauseMs = 1800, erasingSpeed = 30) => {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * messages.length));
  const [text, setText] = useState('');
  const [phase, setPhase] = useState('typing');
  const timerRef = useRef(null);
  const msg = messages[index];

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (phase === 'typing') {
      if (text.length < msg.length) {
        timerRef.current = setTimeout(() => setText(msg.slice(0, text.length + 1)), typingSpeed);
      } else {
        timerRef.current = setTimeout(() => setPhase('erasing'), pauseMs);
      }
    } else if (phase === 'erasing') {
      if (text.length > 0) {
        timerRef.current = setTimeout(() => setText(text.slice(0, -1)), erasingSpeed);
      } else {
        let next;
        do { next = Math.floor(Math.random() * messages.length); } while (next === index && messages.length > 1);
        setIndex(next);
        setPhase('typing');
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, phase, msg, index, messages, typingSpeed, pauseMs, erasingSpeed]);

  return text;
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
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
      else prevTarget.current = target;
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return value;
};

// ===== 카운트다운 훅 =====
// deadline(Date), totalMs(전체 기간 ms) → { days, hours, minutes, seconds, expired, progressRatio }
const useCountdown = (deadline, totalMs) => {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    // deadline이 없으면 동작 안 함
    if (!deadline || !totalMs) return;

    const update = () => {
      const diff = deadline.getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft({
          days: 0, hours: 0, minutes: 0, seconds: 0,
          expired: true, progressRatio: 0,
        });
        return;
      }

      setTimeLeft({
        days:          Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours:         Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes:       Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds:       Math.floor((diff % (1000 * 60)) / 1000),
        expired:       false,
        progressRatio: Math.min(diff / totalMs, 1), // 1(시작) → 0(마감)
      });
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [deadline, totalMs]);

  return timeLeft;
};

// ===== 투표 마감 카운트다운 + 마감 후 참여자 수 컴포넌트 =====
const VoteStatusPanel = ({ deadline, totalMs, totalDays, voteCount }) => {
  const timeLeft = useCountdown(deadline, totalMs);
  const pad = (n) => String(n).padStart(2, '0');

  // deadline 자체가 없으면 (시간 미설정) 렌더링 안 함
  if (!deadline) return null;

  // 계산 전 로딩
  if (!timeLeft) {
    return (
      <div className="mt-6 shrink-0 bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/2 mx-auto" />
      </div>
    );
  }

  // ── 마감 후: 참여자 수 표시 ──
  if (timeLeft.expired) {
    return (
      <div className="mt-6 shrink-0 bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-white/60 tracking-wider uppercase">
            시민 투표 마감
          </span>
          <span className="text-[10px] text-white/30">{totalDays}일 투표</span>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 py-3">
          {/* 마감 뱃지 */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold">
            투표 마감
          </span>

          {/* 참여자 수 */}
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-4xl font-black text-white tabular-nums">
              {voteCount.toLocaleString()}
            </span>
            <span className="text-sm text-white/50 font-medium">명 참여</span>
          </div>

          <span className="text-[10px] text-white/25 mt-1">
            마감: {deadline.toLocaleString('ko-KR', {
              month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>

        {/* 꽉 찬 바 (회색 처리) */}
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-3">
          <div className="h-full w-full rounded-full bg-white/20" />
        </div>
      </div>
    );
  }

  // ── 진행 중: 카운트다운 ──
  // 남은 비율에 따라 색상: 초록 → 주황 → 빨강
  const barColor =
    timeLeft.progressRatio > 0.5 ? '#10b981'
    : timeLeft.progressRatio > 0.2 ? '#f59e0b'
    : '#ef4444';

  return (
    <div className="mt-6 shrink-0 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">

      {/* 라벨 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-white/60 tracking-wider uppercase">
          시민 투표 마감까지
        </span>
        <span className="text-[10px] text-white/30">{totalDays}일 투표</span>
      </div>

      {/* 숫자 타이머 */}
      <div className="flex items-end justify-center gap-1 mb-4">

        {/* 일수: 1일 이상 남았을 때만 표시 */}
        {timeLeft.days > 0 && (
          <>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black text-white tabular-nums leading-none">
                {pad(timeLeft.days)}
              </span>
              <span className="text-[9px] text-white/40 mt-1">일</span>
            </div>
            <span className="text-white/30 text-2xl font-black pb-4">:</span>
          </>
        )}

        <div className="flex flex-col items-center">
          <span className="text-3xl font-black text-white tabular-nums leading-none">
            {pad(timeLeft.hours)}
          </span>
          <span className="text-[9px] text-white/40 mt-1">시간</span>
        </div>
        <span className="text-white/30 text-2xl font-black pb-4">:</span>

        <div className="flex flex-col items-center">
          <span className="text-3xl font-black text-white tabular-nums leading-none">
            {pad(timeLeft.minutes)}
          </span>
          <span className="text-[9px] text-white/40 mt-1">분</span>
        </div>
        <span className="text-white/30 text-2xl font-black pb-4">:</span>

        <div className="flex flex-col items-center">
          {/* 초는 남은 비율에 따라 색상 변경 */}
          <span
            className="text-3xl font-black tabular-nums leading-none transition-colors duration-500"
            style={{ color: barColor }}
          >
            {pad(timeLeft.seconds)}
          </span>
          <span className="text-[9px] text-white/40 mt-1">초</span>
        </div>

      </div>

      {/* 진행 바 (줄어드는 방향) */}
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{
            width: `${timeLeft.progressRatio * 100}%`,
            backgroundColor: barColor,
            boxShadow: `0 0 8px ${barColor}80`,
          }}
        />
      </div>

      {/* 현재 참여자 수 + 마감 일시 */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-white/30">
          현재 <span className="text-white/60 font-bold">{voteCount.toLocaleString()}명</span> 참여 중
        </span>
        <span className="text-[10px] text-white/25">
          {deadline.toLocaleString('ko-KR', {
            month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })} 마감
        </span>
      </div>

    </div>
  );
};

const ModelCard = ({ judgeKey, status, score, onClick }) => {
  const judge = AI_JUDGES[judgeKey];
  const isDone = status === 'done';
  const isFailed = status === 'failed';
  const isActive = status === 'active';
  const displayA = useCountUp(isDone && score ? score.a : null);
  const displayB = useCountUp(isDone && score ? score.b : null);
  const analysisMsg = useTypingMessage(ANALYSIS_MESSAGES);

  const avatarSrc = isFailed ? judge.avatarFailed
    : isDone ? judge.avatarDone
    : isActive ? judge.avatarActive
    : judge.avatar;

  return (
    <div
      onClick={isDone ? onClick : undefined}
      className={`flex-1 rounded-2xl overflow-hidden transition-all duration-500 ${
        isDone ? 'bg-white/[0.08] backdrop-blur-sm border border-white/10 cursor-pointer active:scale-95'
          : isFailed ? 'bg-red-900/15 border border-red-500/20'
          : isActive ? 'bg-white/[0.04] border border-white/5'
          : 'bg-white/[0.03] border border-white/5 opacity-40'
      }`}
    >
      <div className="p-3 flex flex-col items-center text-center">
        <div
          className="w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg shrink-0 transition-all duration-500"
          style={{
            borderColor: isDone ? (judge.borderColor || judge.color) : `${judge.borderColor || judge.color}40`,
            boxShadow: isDone ? `0 4px 14px ${judge.borderColor || judge.color}40` : 'none'
          }}
        >
          <img src={avatarSrc} alt={judge.name} className="w-full h-full object-cover transition-opacity duration-300" />
        </div>
        <span className="text-sm font-sans font-bold text-white mt-2">{judge.name}</span>
        <p className="text-[10px] font-sans text-white/40 truncate w-full">{judge.desc}</p>
        <div className="mt-2">
          {isDone && score ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-[12px] font-black font-sans tracking-wider">
              <span className={displayA >= displayB ? 'text-emerald-400' : 'text-emerald-400/40'}>{String(displayA).padStart(2, '0')}</span>
              <span className="text-white/30">:</span>
              <span className={displayB >= displayA ? 'text-red-400' : 'text-red-400/40'}>{String(displayB).padStart(2, '0')}</span>
            </span>
          ) : isActive ? (
            <span className="text-[10px] text-white/40 font-medium h-4 flex items-center">
              {analysisMsg}
              <span className="inline-block w-[1px] h-[10px] bg-white/40 ml-[1px] animate-pulse" />
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
  const navigate = useNavigate();

  const [judgeStatus, setJudgeStatus]   = useState({ gpt: 'active', gemini: 'active', claude: 'active' });
  const [judgeScores, setJudgeScores]   = useState({ gpt: null, gemini: null, claude: null });
  const [voteCount, setVoteCount]       = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const [isAllDone, setIsAllDone] = useState(false);
  const [debateTitle, setDebateTitle] = useState("데이터를 불러오는 중...");
  const [proSide, setProSide] = useState(null);
  const [conSide, setConSide] = useState(null);
  const [verdictData, setVerdictData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [debateArgs, setDebateArgs] = useState([]);
  const [opponentStatus, setOpponentStatus] = useState('unknown'); // 'not_invited' | 'waiting' | 'writing' | 'ready'

  // ===== 투표 타이머 관련 상태 =====
  const [voteDeadline, setVoteDeadline]   = useState(null); // Date 객체
  const [voteTotalDays, setVoteTotalDays] = useState(null); // 1 | 3 | 7
  const [voteTotalMs, setVoteTotalMs]     = useState(null); // 전체 기간(ms)

  const verdictRef       = useRef(null);
  const confettiFiredRef = useRef(false);

  // 상대방 상태 판단 헬퍼
  const updateOpponentStatus = (debateData) => {
    if (!debateData.opponent_id) {
      setOpponentStatus('not_invited');
    } else {
      setOpponentStatus('writing');
    }
  };

  const fireConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      zIndex: 9999,
      colors: ['#FEE500', '#E63946', '#4285F4', '#10A37F', '#FFFFFF']
    });
  };

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
        // 상대방 상태 판단
        updateOpponentStatus(data);

        // ── 마감 시각 계산 ──
        const rawTime = data.time;
        const days = rawTime ? parseInt(rawTime, 10) : 0;

        if (days > 0) {
          setVoteTotalDays(days);

          const totalMs = days * 24 * 60 * 60 * 1000;
          setVoteTotalMs(totalMs);

          let deadlineDate = null;

          // 1️⃣ 서버에서 deadline 제공
          if (data.deadline) {
            deadlineDate = new Date(data.deadline);
          }
          // 2️⃣ created_at 기반 계산
          else if (data.created_at) {
            deadlineDate = new Date(data.created_at);
            deadlineDate.setDate(deadlineDate.getDate() + days);
          }
          // 3️⃣ fallback
          else {
            const now = new Date();
            deadlineDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
          }

          if (deadlineDate && !isNaN(deadlineDate.getTime())) {
            setVoteDeadline(deadlineDate);
          }
        }

        // 양측 주장 가져오기
        try {
          const args = await getArguments(debateId);
          setDebateArgs(args || []);
          // 주장 기반 상태 업데이트 (4개 주장 = 2라운드 완료)
          const argCount = args?.length || 0;
          if (argCount >= 4) setOpponentStatus('ready');
          else if (argCount > 0) setOpponentStatus('writing');
        } catch (_) {}

      } catch (e) {
        console.error(e);
        setDebateTitle("논쟁 주제를 찾을 수 없습니다.");
      }
    };
    initFetch();

    const pollInterval = setInterval(async () => {
      try {
        // 투표 현황 갱신
        try {
          const voteResponse = await getVoteTally(debateId);
          const totalVotes =
            voteResponse.data?.total_votes ||
            voteResponse.total_votes ||
            voteResponse.total || 0;
          setVoteCount(totalVotes);
        } catch (_) {}

        const debateData = await getDebate(debateId);
        updateOpponentStatus(debateData);

        // arguing 상태에서 주장 업데이트
        if (debateData.status === 'arguing') {
          try {
            const args = await getArguments(debateId);
            setDebateArgs(args || []);
            const argCount = args?.length || 0;
            if (argCount >= 4) setOpponentStatus('ready');
            else if (argCount > 0) setOpponentStatus('writing');
          } catch (_) {}
          return;
        }

        const isVotingOrDone = ['voting', 'completed'].includes(debateData.status);

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
      const timer = setTimeout(() => setDisplayCount(prev => prev + 1), 30);
      return () => clearTimeout(timer);
    }
  }, [displayCount, voteCount]);

  return (
    <div className="fixed inset-0 top-16 flex justify-center bg-[#FAFAF5] z-50">
      <div className="relative flex flex-col w-full max-w-md bg-gradient-to-b from-[#1a2744] via-[#1a2744] via-60% to-[#FAFAF5] shadow-2xl overflow-hidden">
        <div className="flex-1 flex flex-col px-6 pt-16 pb-32 overflow-y-auto">

          {/* ===== 헤더 ===== */}
          <div className="flex flex-col items-center text-center space-y-4 shrink-0">
            {!isAllDone && (
              <h2 className="text-white/80 text-lg font-serif font-bold tracking-tight">
                {opponentStatus === 'not_invited' && '상대방을 기다리고 있습니다...'}
                {opponentStatus === 'writing' && '양측의 주장을 수집하고 있습니다...'}
                {opponentStatus === 'ready' && '배심원단이 아고라에 모였습니다.'}
                {opponentStatus === 'unknown' && '배심원단이 아고라에 모였습니다.'}
              </h2>
            )}
            {isAllDone && (
              <h2 className="text-white text-2xl font-sans font-black tracking-tight">
                현자들이 석판을 내려놓았습니다!
              </h2>
            )}
            <p className="text-[13px] text-white/60 font-sans font-medium text-center italic line-clamp-2 px-4 mt-1 bg-white/5 py-2 rounded-lg w-full">
              "{debateTitle}"
            </p>
            {(proSide || conSide) && (
              <div className="flex items-center gap-2 text-xs font-sans font-bold mt-1">
                <span className="text-emerald-400">{proSide || '찬성'} <span className="text-emerald-400/50">(찬성)</span></span>
                <span className="text-white/30">vs</span>
                <span className="text-red-300">{conSide || '반대'} <span className="text-red-300/50">(반대)</span></span>
              </div>
            )}
          </div>

          {/* ===== AI 판사 카드 ===== */}
          <div className="flex gap-2 mt-8 shrink-0">
            <ModelCard judgeKey="gpt"    status={judgeStatus.gpt}    score={judgeScores.gpt}    onClick={() => verdictRef.current?.scrollToJudge('gpt')} />
            <ModelCard judgeKey="gemini" status={judgeStatus.gemini} score={judgeScores.gemini} onClick={() => verdictRef.current?.scrollToJudge('gemini')} />
            <ModelCard judgeKey="claude" status={judgeStatus.claude} score={judgeScores.claude} onClick={() => verdictRef.current?.scrollToJudge('claude')} />
          </div>

          {/* ===== 투표 상태 패널 =====
              - 진행 중 → 카운트다운 타이머 + 현재 참여자 수
              - 마감 후 → "N명 참여" 결과 표시
              - 시간 미설정(voteDeadline null) → 렌더링 안 함          */}
          {!isAllDone && (
            <VoteStatusPanel
              deadline={voteDeadline}
              totalMs={voteTotalMs}
              totalDays={voteTotalDays}
              voteCount={displayCount}
            />
          )}

          {/* ===== 양측 주장 미리보기 (라운드별) ===== */}
          {!isAllDone && debateArgs.length > 0 && (() => {
            const r1Args = debateArgs.filter(a => (a.round || 1) === 1);
            const r2Args = debateArgs.filter(a => a.round === 2);
            const renderArg = (arg, idx) => {
              const isA = arg.side === 'A';
              return (
                <div key={idx} className={`bg-white/5 border rounded-2xl p-4 ${isA ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    {isA ? <ThumbsUp size={12} className="text-emerald-400" /> : <ThumbsDown size={12} className="text-red-400" />}
                    <span className={`text-[11px] font-bold ${isA ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isA ? '찬성' : '반대'}{arg.user?.nickname ? ` : ${arg.user.nickname}` : ''}
                    </span>
                  </div>
                  <p className="text-[12px] text-white/50 leading-[1.7] line-clamp-3">{arg.content}</p>
                </div>
              );
            };
            return (
              <div className="mt-8 shrink-0 space-y-4">
                {r1Args.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 px-1">Round 1 — 주장</p>
                    {r1Args.map((a, i) => renderArg(a, `r1-${i}`))}
                  </div>
                )}
                {r2Args.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 px-1">Round 2 — 반박</p>
                    {r2Args.map((a, i) => renderArg(a, `r2-${i}`))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ===== 판결 프로세스 안내 ===== */}
          {!isAllDone && (
            <div className="mt-6 shrink-0 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div className="w-8 h-8 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center">
                    <span className="text-gold text-[12px] font-black">1</span>
                  </div>
                  <span className="text-[10px] font-bold text-gold">주장 분석</span>
                  <span className="text-[9px] text-white/30">진행 중</span>
                </div>
                <div className="w-8 h-px bg-white/10" />
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div className="w-8 h-8 rounded-full bg-white/5 border-2 border-white/20 flex items-center justify-center">
                    <span className="text-white/30 text-[12px] font-black">2</span>
                  </div>
                  <span className="text-[10px] font-bold text-white/30 text-center leading-tight">
                    현자 판결<br />+ 시민 투표
                  </span>
                  <span className="text-[9px] text-white/20">
                    {voteTotalDays ? `${voteTotalDays}일간` : '시간 미설정'}
                  </span>
                </div>
                <div className="w-8 h-px bg-white/10" />
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div className="w-8 h-8 rounded-full bg-white/5 border-2 border-white/20 flex items-center justify-center">
                    <span className="text-white/30 text-[12px] font-black">3</span>
                  </div>
                  <span className="text-[10px] font-bold text-white/30">최종 판결</span>
                  <span className="text-[9px] text-white/20">확정</span>
                </div>
              </div>
            </div>
          )}

          {/* ===== 판결 대기 버튼 ===== */}
          {!isAllDone && (
            <div className="mt-6 shrink-0">
              <button
                disabled
                className="w-full h-[60px] rounded-[18px] font-black text-lg bg-white/10 text-white/30 border border-white/5 cursor-not-allowed flex items-center justify-center"
              >
                <span className="animate-pulse">판결문 작성이 진행중...</span>
              </button>
            </div>
          )}

          {/* ===== 판결 결과 (완료 시) ===== */}
          {isAllDone && verdictData && (
            <div className="mt-8">
              <VerdictContent ref={verdictRef} verdictData={verdictData} topic={debateTitle} />
              <button
                onClick={() => {
                  const url = `${window.location.origin}/debate/${debateId}`;
                  navigator.clipboard.writeText(url).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className={`w-full mt-5 py-4 rounded-xl font-sans font-bold text-base uppercase tracking-wider border-2 shadow-md active:scale-95 transition-all duration-300 ${
                  copied
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20'
                    : 'bg-primary text-gold border-gold hover:bg-gold hover:text-primary hover:shadow-[0_0_15px_rgba(212,175,55,0.5)]'
                }`}
              >
                {copied ? '✓ 링크가 복사되었습니다!' : '판결 공유하기'}
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full mt-3 py-4 rounded-xl font-sans font-bold text-base border-2 border-white/20 text-white/50 hover:border-white/40 hover:text-white/70 active:scale-95 transition-all duration-300"
              >
                판결 닫기
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
