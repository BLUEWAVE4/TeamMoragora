import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDebate, getArguments, submitArgument } from '../../services/api'
import { useAuth } from '../../store/AuthContext'
import { Target, Tag, Scale } from 'lucide-react';

const labelMap = {
  battle: '승부', consensus: '합의', analysis: '분석',
  logic: '논리', emotion: '감정', practical: '현실', ethics: '윤리', general: '일반',
  society: '사회', technology: '기술', politics: '정치', philosophy: '철학',
  daily: '일상', culture: '문화', sports: '스포츠', entertainment: '연예',
}
const toKor = (v) => labelMap[v] || v

const MAX_CHAR_R1 = 2000
const MAX_CHAR_R2 = 300

// ===== 제출된 주장 카드 (읽기전용) =====
function SubmittedCard({ label, side, content, isMe }) {
  return (
    <div className={`rounded-2xl border-2 px-5 py-4 transition-all duration-500 ${
      isMe
        ? 'bg-gradient-to-b from-[#F5F0E8] to-white border-[#D4AF37]/20 shadow-inner'
        : 'bg-white border-[#1B2A4A]/10'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${
          side === 'A' ? 'text-emerald-500' : 'text-red-500'
        }`}>{label}</span>
      </div>
      <p className="text-[14px] leading-[1.7] text-[#1B2A4A]/70">{content}</p>
    </div>
  )
}

// ===== 대기 메시지 로테이션 =====
const WAITING_MESSAGES = [
  '상대방이 신중하게 논거를 정리하고 있습니다...',
  '상대방이 강력한 주장을 준비하고 있습니다...',
  '상대방이 깊은 고민에 빠져 있습니다...',
  '상대방이 결정적 한 방을 구상 중입니다...',
  '상대방의 펜이 바쁘게 움직이고 있습니다...',
  '상대방이 논리의 칼날을 벼리고 있습니다...',
  '상대방이 설득력 있는 문장을 다듬고 있습니다...',
];

function useTypingEffect(messages, typingSpeed = 50, deleteSpeed = 30, pauseMs = 2000) {
  const [displayed, setDisplayed] = React.useState('');
  const [msgIdx, setMsgIdx] = React.useState(() => Math.floor(Math.random() * messages.length));
  const [charIdx, setCharIdx] = React.useState(0);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    const current = messages[msgIdx];

    if (!isDeleting && charIdx <= current.length) {
      if (charIdx === current.length) {
        const pause = setTimeout(() => setIsDeleting(true), pauseMs);
        return () => clearTimeout(pause);
      }
      const timer = setTimeout(() => {
        setDisplayed(current.slice(0, charIdx + 1));
        setCharIdx(prev => prev + 1);
      }, typingSpeed);
      return () => clearTimeout(timer);
    }

    if (isDeleting && charIdx >= 0) {
      if (charIdx === 0) {
        setIsDeleting(false);
        setMsgIdx(prev => (prev + 1) % messages.length);
        setDisplayed('');
        return;
      }
      const timer = setTimeout(() => {
        setDisplayed(current.slice(0, charIdx - 1));
        setCharIdx(prev => prev - 1);
      }, deleteSpeed);
      return () => clearTimeout(timer);
    }
  }, [msgIdx, charIdx, isDeleting, messages, typingSpeed, deleteSpeed, pauseMs]);

  return displayed;
}

// ===== 대기 카드 =====
function WaitingCard({ label, side, submitted }) {
  const typedText = useTypingEffect(WAITING_MESSAGES);
  return (
    <div className="rounded-2xl border-2 border-dashed border-[#1B2A4A]/10 bg-[#F5F0E8]/30 px-5 py-5 text-center">
      <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${
        side === 'A' ? 'text-emerald-400/50' : 'text-red-400/50'
      }`}>{label}</span>
      {submitted ? (
        <p className="text-[13px] text-[#1B2A4A]/30 mt-1.5 font-medium">
          제출 완료
        </p>
      ) : (
        <p className="text-[13px] text-[#1B2A4A]/25 mt-1.5 h-[20px]">
          {typedText}<span className="inline-block w-[1.5px] h-[13px] bg-[#1B2A4A]/20 ml-[1px] align-middle animate-blink" />
        </p>
      )}
    </div>
  )
}

// ===== 라운드 헤더 =====
function RoundHeader({ num, label, state }) {
  // state: 'active' | 'done' | 'locked'
  return (
    <div className="flex items-center gap-2.5 px-1">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black border-2 transition-all duration-500 ${
        state === 'done'
          ? 'bg-[#1B2A4A] text-[#D4AF37] border-[#1B2A4A]'
          : state === 'active'
            ? 'bg-[#D4AF37] text-[#1B2A4A] border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.3)]'
            : 'bg-[#F5F0E8] text-[#1B2A4A]/25 border-[#1B2A4A]/10'
      }`}>{num}</div>
      <p className={`text-[11px] font-bold uppercase tracking-[0.15em] font-serif ${
        state === 'locked' ? 'text-[#1B2A4A]/15' : 'text-[#1B2A4A]/40'
      }`}>
        {label}
      </p>
    </div>
  )
}

// ===== 라운드 입력 폼 =====
function RoundForm({ roundNum, isActive, content, setContent, onSubmit, isSubmitting }) {
  const maxChar = roundNum === 1 ? MAX_CHAR_R1 : MAX_CHAR_R2;
  const isInvalid = content.length === 0 || content.length > maxChar;

  return (
    <div className={`flex flex-col gap-3 transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
      <div>
        <div className={`bg-gradient-to-b from-[#F5F0E8] to-white rounded-2xl border-2 transition-all duration-500 shadow-inner ${
          !isActive
            ? 'border-[#1B2A4A]/10'
            : content.trim().length > 0
              ? 'border-[#D4AF37]/40'
              : 'border-[#D4AF37]/15 focus-within:border-[#D4AF37]/40'
        }`}>
          <textarea
            className="w-full h-44 px-5 pt-4 pb-4 focus:outline-none resize-none text-[16px] leading-[1.7] text-[#1B2A4A] placeholder:text-[#1B2A4A]/25 bg-transparent"
            placeholder={roundNum === 1
              ? '상대방을 설득할 수 있는 근거를 제시해주세요.'
              : '상대방의 1라운드 주장에 대해 반박해주세요.'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={maxChar}
            disabled={!isActive}
          />
        </div>
        <div className="px-2 py-1.5 flex justify-end">
          <span className="text-[10px] tracking-widest tabular-nums text-[#1B2A4A]/25">
            {content.length.toLocaleString()} / {maxChar.toLocaleString()}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!isActive || isInvalid || isSubmitting}
        className={`w-full py-3.5 rounded-xl font-serif font-bold text-[16px] uppercase tracking-wide border-2 transition-all duration-300 shadow-md flex items-center justify-center gap-2 ${
          !isActive || isInvalid || isSubmitting
            ? 'bg-[#F5F0E8] text-[#1B2A4A]/15 border-[#1B2A4A]/5 shadow-none cursor-not-allowed'
            : 'bg-[#1B2A4A] text-[#D4AF37] border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-[#1B2A4A] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-95 cursor-pointer'
        }`}
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
            <span>제출 중...</span>
          </>
        ) : (
          <span>{roundNum === 1 ? '주장 제출하기' : '반박 제출하기'}</span>
        )}
      </button>
    </div>
  )
}

// ===== 메인 컴포넌트 =====
export default function ArgumentPage() {
  const { debateId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [debate, setDebate] = useState(null)
  const [args, setArgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [r1Content, setR1Content] = useState('')
  const [r2Content, setR2Content] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [debateData, argsData] = await Promise.all([
        getDebate(debateId),
        getArguments(debateId),
      ]);
      setDebate(debateData);
      setArgs(argsData || []);

      // 4개 주장 완료 또는 judging 상태면 자동 이동
      if (argsData?.length >= 4 || debateData?.status === 'judging') {
        navigate(`/debate/${debateId}/judging`);
      }
    } catch (err) {
      console.error("데이터 로드 에러:", err)
    } finally {
      setLoading(false)
    }
  }, [debateId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 상대방 주장 대기 폴링 (3초)
  useEffect(() => {
    if (!debate || debate.status !== 'arguing') return;
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [debate?.status, fetchData]);

  if (loading || !debate) return (
    <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
      <div className="animate-pulse text-[#1B2A4A]/30 font-serif font-bold">논쟁 정보를 불러오는 중...</div>
    </div>
  )

  const isCreator = user && user.id === debate.creator_id;
  const mySide = isCreator ? 'A' : 'B';
  const otherSide = isCreator ? 'B' : 'A';
  const myLabel = isCreator ? '찬성' : '반대';
  const otherLabel = isCreator ? '반대' : '찬성';

  const getArg = (side, round) => args.find(a => a.side === side && (a.round || 1) === round);
  const myR1 = getArg(mySide, 1);
  const otherR1 = getArg(otherSide, 1);
  const myR2 = getArg(mySide, 2);
  const otherR2 = getArg(otherSide, 2);

  const r1BothDone = !!myR1 && !!otherR1;
  const r2BothDone = !!myR2 && !!otherR2;
  const activeRound = !myR1 ? 1 : (r1BothDone && !myR2) ? 2 : 0;

  const r1State = myR1 ? 'done' : 'active';
  const r2State = myR2 ? 'done' : r1BothDone ? 'active' : 'locked';

  const handleSubmit = async (round) => {
    const content = round === 1 ? r1Content : r2Content;
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitArgument(debateId, { content, side: mySide, round });
      if (round === 1) setR1Content('');
      else setR2Content('');
      await fetchData();

      const updatedArgs = await getArguments(debateId);
      if (updatedArgs.length >= 4) {
        navigate(`/debate/${debateId}/judging`);
      }
    } catch (err) {
      alert(err.message || '제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pb-24">
      <div className="w-full max-w-[440px] px-5 flex flex-col gap-5 pt-6">

        {/* ===== 상단 논쟁 정보 카드 ===== */}
        <div className="w-full bg-gradient-to-br from-[#1B2A4A] to-[#2d3a5d] text-white px-6 py-6 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-xl" />

          <div className="flex flex-wrap gap-1.5 mb-3">
            {[
              { icon: Target, value: debate?.purpose },
              { icon: Scale, value: debate?.lens },
              { icon: Tag, value: debate?.category },
            ].map(({ icon: Icon, value }, i) => (
              <span key={i} className="flex items-center gap-1 bg-[#D4AF37]/15 border border-[#D4AF37]/25 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#D4AF37] tracking-wide">
                <Icon size={10} /> {toKor(value)}
              </span>
            ))}
          </div>

          <h1 className="font-serif text-[17px] font-bold leading-[1.5] mb-4">
            "{debate?.topic}"
          </h1>

          {(debate?.pro_side || debate?.con_side) && (
            <div className="flex items-stretch gap-2">
              <div className={`flex-1 rounded-xl px-3 py-2 border text-center ${
                isCreator ? 'bg-emerald-500/15 border-emerald-400/30' : 'bg-white/5 border-white/10'
              }`}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-emerald-400/70">찬성</p>
                <p className={`text-[12px] font-bold leading-tight ${isCreator ? 'text-emerald-300' : 'text-white/30'}`}>
                  {debate.pro_side || '미정'}
                </p>
                {isCreator && <p className="text-[9px] text-emerald-400/50 font-bold mt-0.5">내 입장</p>}
              </div>
              <div className="flex items-center justify-center px-1">
                <span className="text-white/20 text-[10px] font-black">VS</span>
              </div>
              <div className={`flex-1 rounded-xl px-3 py-2 border text-center ${
                !isCreator ? 'bg-red-500/15 border-red-400/30' : 'bg-white/5 border-white/10'
              }`}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-red-400/70">반대</p>
                <p className={`text-[12px] font-bold leading-tight ${!isCreator ? 'text-red-300' : 'text-white/30'}`}>
                  {debate.con_side || '미정'}
                </p>
                {!isCreator && <p className="text-[9px] text-red-400/50 font-bold mt-0.5">내 입장</p>}
              </div>
            </div>
          )}
        </div>

        {/* ===== ROUND 1 ===== */}
        <div className="flex flex-col gap-3">
          <RoundHeader num={1} label="Round 1 — 주장" state={r1State} />

          {myR1 && (
            <SubmittedCard label={myLabel} side={mySide} content={myR1.content} isMe />
          )}
          {r1BothDone ? (
            <SubmittedCard label={otherLabel} side={otherSide} content={otherR1.content} isMe={false} />
          ) : myR1 ? (
            <WaitingCard label={otherLabel} side={otherSide} submitted={!!otherR1} />
          ) : null}

          {!myR1 && (
            <RoundForm
              roundNum={1}
              isActive={activeRound === 1}
              content={r1Content}
              setContent={setR1Content}
              onSubmit={() => handleSubmit(1)}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {/* ===== 라운드 구분선 ===== */}
        <div className="flex items-center gap-3 px-4">
          <div className="flex-1 h-px bg-[#1B2A4A]/5" />
          <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${r1BothDone ? 'bg-[#D4AF37]/40' : 'bg-[#1B2A4A]/10'}`} />
          <div className="flex-1 h-px bg-[#1B2A4A]/5" />
        </div>

        {/* ===== ROUND 2 ===== */}
        <div className="flex flex-col gap-3">
          <RoundHeader num={2} label="Round 2 — 반박" state={r2State} />

          {myR2 && (
            <SubmittedCard label={myLabel} side={mySide} content={myR2.content} isMe />
          )}
          {r2BothDone ? (
            <SubmittedCard label={otherLabel} side={otherSide} content={otherR2.content} isMe={false} />
          ) : myR2 ? (
            <WaitingCard label={otherLabel} side={otherSide} submitted={!!otherR2} />
          ) : null}

          {!myR2 && (
            <RoundForm
              roundNum={2}
              isActive={activeRound === 2}
              content={r2Content}
              setContent={setR2Content}
              onSubmit={() => handleSubmit(2)}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        <p className="text-center text-[#1B2A4A]/20 text-[10px] tracking-wide font-medium">
          제출된 주장은 수정할 수 없습니다.
        </p>
      </div>
    </div>
  )
}
