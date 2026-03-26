import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDebate, getArguments, submitArgument, generateSoloArgument } from '../../services/api'
import { useAuth } from '../../store/AuthContext'
import { CircleCheck, CircleDot, Circle } from 'lucide-react'
import MoragoraModal from '../../components/common/MoragoraModal'

const labelMap = {
  battle: '승부', consensus: '합의', analysis: '분석',
  logic: '논리', emotion: '감정', practical: '현실', ethics: '윤리', general: '일반',
  society: '사회', technology: '기술', politics: '정치', philosophy: '철학',
  daily: '일상', culture: '문화', sports: '스포츠', entertainment: '연예',
}
const toKor = (v) => labelMap[v] || v

const MAX_CHAR_R1 = 2000
const MAX_CHAR_R2 = 300

      {/* 뱃지 */}
function JusticeBadge() {
  return (
    <div className="mb-6 relative">
      <div className="absolute inset-0 bg-[#D4AF37]/10 rounded-full blur-2xl scale-150" />
      <div className="relative w-20 h-20 rounded-full border border-[#D4AF37]/30 bg-gradient-to-b from-[#ffffff10] to-transparent p-1.5 shadow-2xl">
        <div className="w-full h-full rounded-full border-2 border-[#D4AF37] flex items-center justify-center bg-[#1B2A4A] shadow-[inner_0_0_15px_rgba(212,175,55,0.2)]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M9 21H15" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M6 8L12 6L18 8" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M3 14C3 14 3 17 6 17C9 17 9 14 9 14L6 8L3 14Z" fill="#D4AF37" fillOpacity="0.2" stroke="#D4AF37" strokeWidth="1.2"/>
            <path d="M15 14C15 14 15 17 18 17C21 17 21 14 21 14L18 8L15 14Z" fill="#D4AF37" fillOpacity="0.2" stroke="#D4AF37" strokeWidth="1.2"/>
            <circle cx="12" cy="6" r="1" fill="#D4AF37"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── 제출된 주장 카드 ──
function SubmittedCard({ label, side, content, isMe }) {
  return (
    <div className={`rounded-xl border px-5 py-4 ${
      isMe ? 'bg-[#F5F0E8] border-[#D4AF37]/30' : 'bg-white border-gray-100'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <CircleCheck size={14} className={side === 'A' ? 'text-emerald-500' : 'text-red-500'} />
        <span className={`text-[10px] font-black uppercase tracking-widest ${
          side === 'A' ? 'text-emerald-600' : 'text-red-500'
        }`}>{label} {isMe ? '· 내 주장' : '· 상대방 주장'}</span>
      </div>
      <p className="text-[14px] leading-[1.75] text-[#1B2A4A]/75">{content}</p>
    </div>
  )
}

const WAITING_MESSAGES = [
  '상대방이 신중하게 논거를 정리하고 있습니다...',
  '상대방이 강력한 주장을 준비하고 있습니다...',
  '상대방이 깊은 고민에 빠져 있습니다...',
]

function useTypingEffect(messages, typingSpeed = 50, deleteSpeed = 30, pauseMs = 2000) {
  const [displayed, setDisplayed] = React.useState('')
  const [msgIdx, setMsgIdx] = React.useState(() => Math.floor(Math.random() * messages.length))
  const [charIdx, setCharIdx] = React.useState(0)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    const current = messages[msgIdx]
    if (!isDeleting && charIdx <= current.length) {
      if (charIdx === current.length) {
        const pause = setTimeout(() => setIsDeleting(true), pauseMs)
        return () => clearTimeout(pause)
      }
      const timer = setTimeout(() => {
        setDisplayed(current.slice(0, charIdx + 1))
        setCharIdx(prev => prev + 1)
      }, typingSpeed)
      return () => clearTimeout(timer)
    }
    if (isDeleting && charIdx >= 0) {
      if (charIdx === 0) {
        setIsDeleting(false)
        setMsgIdx(prev => (prev + 1) % messages.length)
        setDisplayed('')
        return
      }
      const timer = setTimeout(() => {
        setDisplayed(current.slice(0, charIdx - 1))
        setCharIdx(prev => prev - 1)
      }, deleteSpeed)
      return () => clearTimeout(timer)
    }
  }, [msgIdx, charIdx, isDeleting, messages, typingSpeed, deleteSpeed, pauseMs])

  return displayed
}

// ── 대기 카드 ──
function WaitingCard({ label, side, submitted }) {
  const typedText = useTypingEffect(WAITING_MESSAGES)
  return (
    <div className="rounded-xl border border-dashed border-[#1B2A4A]/10 bg-[#FAFAF5] px-5 py-4 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <CircleDot size={14} className={side === 'A' ? 'text-emerald-300' : 'text-red-300'} />
        <span className={`text-[10px] font-black uppercase tracking-widest ${
          side === 'A' ? 'text-emerald-400/60' : 'text-red-400/60'
        }`}>{label}</span>
      </div>
      {submitted ? (
        <p className="text-[12px] text-[#1B2A4A]/30 font-medium">제출 완료 · 대기 중</p>
      ) : (
        <p className="text-[12px] text-[#1B2A4A]/25 h-[18px]">
          {typedText}
          <span className="inline-block w-[1.5px] h-[12px] bg-[#1B2A4A]/20 ml-[1px] align-middle animate-pulse" />
        </p>
      )}
    </div>
  )
}

// ── 라운드 헤더 ──
function RoundHeader({ num, label, state }) {
  const isActive = state === 'active';
  const isDone = state === 'done';

  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black border-2 transition-all duration-500 flex-shrink-0 ${
        isDone
          ? 'bg-gray-100 text-gray-400 border-gray-200'
          : isActive
            ? 'bg-[#D4AF37] text-white border-[#D4AF37] shadow-[0_0_8px_rgba(16,185,129,0.3)]' // 작성 중 초록색
            : 'bg-white text-gray-200 border-gray-100' 
      }`}>{num}</div>

      <p className={`text-[12px] font-black uppercase tracking-widest transition-colors duration-500 ${
        isActive 
          ? 'text-[#D4AF37]'
          : isDone 
            ? 'text-gray-400' 
            : 'text-gray-300' 
      }`}>
        {label}
      </p>
    
      <div className={`flex-1 h-px transition-colors duration-500 ${
        isActive ? 'bg-[#D4AF37]' : 'bg-gray-100'
      }`} />
    </div>
  )
}

// ── 라운드 입력 폼 ──
function RoundForm({ roundNum, isActive, content, setContent, onSubmit, isSubmitting }) {
  const maxChar = roundNum === 1 ? MAX_CHAR_R1 : MAX_CHAR_R2
  const minChar = 10
  const isInvalid = content.trim().length < minChar || content.length > maxChar

  return (
    <div className={`flex flex-col gap-3 transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
      <div className={`bg-white rounded-xl border-2 overflow-hidden transition-all duration-300 ${
        !isActive ? 'border-gray-100'
          : content.trim().length > 0 ? 'border-[#D4AF37]/50'
          : 'border-gray-100 focus-within:border-[#D4AF37]/40 shadow-sm'
      }`}>
        <textarea
          className="w-full px-5 pt-4 pb-3 focus:outline-none resize-none text-[15px] leading-[1.75] text-[#1B2A4A] placeholder:text-[#1B2A4A]/20 bg-transparent"
          style={{ minHeight: roundNum === 1 ? '160px' : '100px' }}
          placeholder={roundNum === 1
            ? '상대방을 설득할 수 있는 논리적 근거를 작성해주세요.'
            : '상대방의 1라운드 주장에 대해 반박해주세요.'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={maxChar}
          disabled={!isActive}
        />
        <div className="px-5 py-2.5 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-1.5">
            {content.trim().length < minChar
              ? <Circle size={12} className="text-gray-300" />
              : content.length > maxChar
                ? <CircleDot size={12} className="text-red-400" />
                : <CircleCheck size={12} className="text-emerald-400" />
            }
            <span className={`text-[10px] font-bold ${
              content.trim().length < minChar ? 'text-gray-300'
                : content.length > maxChar ? 'text-red-500'
                : 'text-emerald-500'
            }`}>
              {content.trim().length === 0 ? '내용을 입력해주세요'
                : content.trim().length < minChar ? `${minChar}자 이상 입력해주세요`
                : content.length > maxChar ? '글자 수 초과'
                : '제출 가능'}
            </span>
          </div>
          <span className="text-[10px] tabular-nums text-[#1B2A4A]/25">
            {content.length.toLocaleString()} / {maxChar.toLocaleString()}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!isActive || isInvalid || isSubmitting}
        className={`w-full h-[50px] rounded-xl font-black text-[15px] tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
          !isActive || isInvalid || isSubmitting
            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
            : 'bg-[#1B2A4A] text-[#D4AF37] active:scale-[0.97] cursor-pointer shadow-md'
        }`}
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
            <span>제출 중...</span>
          </>
        ) : (
          <span>{roundNum === 1 ? '1라운드 주장 제출하기' : '2라운드 반박 제출하기'}</span>
        )}
      </button>
    </div>
  )
}

// ── 메인 컴포넌트 ──
export default function ArgumentPage() {
  const { debateId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [debate, setDebate] = useState(null)
  const [args, setArgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleted, setDeleted] = useState(false)
  const [r1Content, setR1Content] = useState('')
  const [r2Content, setR2Content] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalState, setModalState] = useState({ isOpen: false, title: '', description: '' })
  const showModal = (title, description) => setModalState({ isOpen: true, title, description })
  const closeModal = () => setModalState({ isOpen: false, title: '', description: '' })

  const fetchData = useCallback(async () => {
    try {
      const [debateData, argsData] = await Promise.all([
        getDebate(debateId),
        getArguments(debateId),
      ])
      
      if (debateData?.mode === 'chat') {
        navigate(`/debate/${debateId}/chat`, { replace: true });
        return; // 아래 setDebate 등을 실행하지 않고 즉시 종료
      }

      setDebate(debateData)
      setArgs(argsData || [])
      if (argsData?.length >= 4 || debateData?.status === 'judging') {
        navigate(`/debate/${debateId}/judging`)
      }
    } catch (err) {
      console.error('데이터 로드 에러:', err)
      if (err?.status === 404 || err?.response?.status === 404 || err?.message?.includes('찾을 수 없')) {
        setDeleted(true)
      }
    } finally {
      setLoading(false)
    }
  }, [debateId, navigate])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!debate || debate.status !== 'arguing') return
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [debate?.status, fetchData])

  useEffect(() => {
    if (deleted) {
      const timer = setTimeout(() => navigate('/'), 3000)
      return () => clearTimeout(timer)
    }
  }, [deleted, navigate])

  if (deleted) return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center justify-center p-7 text-center">
      <div className="w-16 h-16 rounded-full bg-[#1B2A4A]/10 flex items-center justify-center mb-5">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1B2A4A" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
      </div>
      <h1 className="text-[18px] font-black text-[#1B2A4A] mb-2">모든 참여자의 동의로 무효처리된 논쟁입니다.</h1>
      <p className="text-[13px] text-gray-400 mt-3">잠시 후 홈으로 이동됩니다.</p>
    </div>
  )

  if (loading || !debate) return (
    <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-[11px] tracking-widest">논쟁 정보를 불러오는 중...</p>
      </div>
    </div>
  )

  const isCreator = user && user.id === debate.creator_id
  const mySide = isCreator ? 'A' : 'B'
  const otherSide = isCreator ? 'B' : 'A'
  const myLabel = isCreator ? 'A측' : 'B측'
  const otherLabel = isCreator ? 'B측' : 'A측'

  const getArg = (side, round) => args.find(a => a.side === side && (a.round || 1) === round)
  const myR1 = getArg(mySide, 1)
  const otherR1 = getArg(otherSide, 1)
  const myR2 = getArg(mySide, 2)
  const otherR2 = getArg(otherSide, 2)

  const r1BothDone = !!myR1 && !!otherR1
  const r2BothDone = !!myR2 && !!otherR2

  const activeRound = !myR1 ? 1 : (r1BothDone && !myR2) ? 2 : 0
  const r1State = myR1 ? 'done' : 'active'
  const r2State = myR2 ? 'done' : r1BothDone ? 'active' : 'locked'

  const handleSubmit = async (round) => {
    const content = round === 1 ? r1Content : r2Content
    if (!content.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await submitArgument(debateId, { content, side: mySide, round })
      if (round === 1) setR1Content('')
      else setR2Content('')

      // 연습 모드: 각 라운드 제출 후 AI(소크라테스) B측 자동 생성
      if (debate?.mode === 'solo') {
        try {
          await generateSoloArgument(debateId)
          if (round === 2) {
            // R2 반박까지 완료 → 판결
            navigate(`/debate/${debateId}/judging`)
            return
          }
          // R1 → AI B측 R1 생성 완료 → 반박 단계로 갱신
          await fetchData()
          return
        } catch (soloErr) {
          showModal('AI 주장 생성에 실패했습니다', '다시 시도해주세요.', 'error')
          return
        }
      }

      await fetchData()
      const updatedArgs = await getArguments(debateId)
      if (updatedArgs.length >= 4) navigate(`/debate/${debateId}/judging`)
    } catch (err) {
      const serverMsg = err?.response?.data?.error || err?.message || '';
      const reason = err?.response?.data?.reason || '';
      const stage = err?.response?.data?.stage;

      if (stage === 1) {
        const isPersonalInfo = reason?.includes('개인정보');
        showModal(
          isPersonalInfo ? '개인정보가 포함되어 있습니다' : '부적절한 표현이 포함되어 있습니다',
          isPersonalInfo ? '전화번호, 주민번호, 이메일 등 개인정보는 포함할 수 없습니다.' : (reason || '비속어나 부적절한 표현을 수정해주세요.')
        );
      } else if (stage === 2) {
        showModal('유해한 콘텐츠가 감지되었습니다', reason || '내용을 수정한 후 다시 제출해주세요.');
      } else if (stage === 3) {
        showModal('주제와 관련 없는 내용입니다', '논쟁 주제에 맞는 주장을 작성해주세요.');
      } else {
        showModal('제출에 실패했습니다', serverMsg || '네트워크 상태를 확인하고 다시 시도해주세요.');
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pb-16">
      <div className="w-full max-w-md">

        {/* ── 헤더 ── */}
        <div className="bg-[#1B2A4A] pt-8 pb-9 px-6 flex flex-col items-center text-center relative overflow-hidden rounded-b-2xl shadow-xl">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-[#D4AF37]/5 rounded-full blur-lg" />
          {/* ── 상단 로고 ── */}
          <JusticeBadge />
          <h1 className="text-white text-[18px] font-black leading-snug mt-3">
            "{debate?.topic}"
          </h1>
        </div>

        {/* ── 바디 카드 ── */}
        <div className="bg-white mx-4 mt-[-12px] rounded-2xl shadow-xl px-5 pt-7 pb-5 relative z-10 flex flex-col gap-5">

          {/* A/B측 입장 */}
          {(debate?.pro_side || debate?.con_side) && (
            <div className="grid grid-cols-[1fr_24px_1fr] items-center border-b border-gray-100 pb-5">
              <div className={`rounded-xl px-3 py-2.5 text-center border ${
                isCreator ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'
              }`}>
                <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-wider mb-1">A측</p>
                <p className={`text-[12px] font-bold leading-tight ${isCreator 
                  ? 'text-emerald-700' 
                  : 'text-gray-400 p-2'}`}>
                  {debate.pro_side || '미정'}
                </p>
                {isCreator && <p className="text-[9px] text-emerald-500/60 font-bold mt-0.5">내 입장</p>}
              </div>
              <div className="text-center text-[10px] font-black text-[#D4AF37]/50">VS</div>
              <div className={`rounded-xl px-3 py-2.5 text-center border ${
                !isCreator ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'
              }`}>
                <p className="text-[10px] font-black text-red-400/70 uppercase tracking-wider mb-1">B측</p>
                <p className={`text-[12px] font-bold leading-tight ${!isCreator 
                  ? 'text-red-700' 
                  : 'text-gray-400 p-2'}`}>
                  {debate.con_side || '미정'}
                </p>
                {!isCreator && <p className="text-[9px] text-red-400/60 font-bold mt-0.5">내 입장</p>}
              </div>
            </div>
          )}

          {/* ROUND 1 */}
          <div className="flex flex-col gap-3">
            <RoundHeader num={1} label="1라운드 · 주장" state={r1State} />
            {myR1 && <SubmittedCard label={myLabel} side={mySide} content={myR1.content} isMe />}
            {r1BothDone
              ? <SubmittedCard label={otherLabel} side={otherSide} content={otherR1.content} isMe={false} />
              : myR1 ? <WaitingCard label={otherLabel} side={otherSide} submitted={!!otherR1} /> : null}
            {!myR1 && (
              <RoundForm roundNum={1} isActive={activeRound === 1}
                content={r1Content} setContent={setR1Content}
                onSubmit={() => handleSubmit(1)} isSubmitting={isSubmitting} />
            )}
          </div>

          {/* 구분선 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <CircleDot size={12} className={`transition-colors duration-500 ${r1BothDone ? 'text-[#D4AF37]/50' : 'text-gray-200'}`} />
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* ROUND 2 */}
          <div className="flex flex-col gap-3">
            <RoundHeader num={2} label="2라운드 · 반박" state={r2State} />
            {myR2 && <SubmittedCard label={myLabel} side={mySide} content={myR2.content} isMe />}
            {r2BothDone
              ? <SubmittedCard label={otherLabel} side={otherSide} content={otherR2.content} isMe={false} />
              : myR2 ? <WaitingCard label={otherLabel} side={otherSide} submitted={!!otherR2} /> : null}
            {!myR2 && (
              <RoundForm roundNum={2} isActive={activeRound === 2}
                content={r2Content} setContent={setR2Content}
                onSubmit={() => handleSubmit(2)} isSubmitting={isSubmitting} />
            )}
          </div>

          <p className="text-center text-gray-300 text-[10px] font-medium tracking-widest">
            제출된 주장은 수정할 수 없습니다
          </p>
        </div>


      </div>

      <MoragoraModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.description}
        type="error"
      />
    </div>
  )
}