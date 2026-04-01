import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createAvatar } from '@dicebear/core'
import { avataaars } from '@dicebear/collection'
import useSocraticFeedback from '../../hooks/useSocraticFeedback'

// ===== 소크라테스 상태 기계 =====
// idle → idleErasing → loading → loadingErasing → talking → showing
//                                                              ↓ (클릭)
//                                                         dismissing → loading → ...
const PHASES = {
  idle: 'idle',
  idleErasing: 'idleErasing',
  loading: 'loading',
  loadingErasing: 'loadingErasing',
  talking: 'talking',
  showing: 'showing',
  dismissing: 'dismissing',
  farewell: 'farewell',
  gone: 'gone',
}

const FAREWELL_QUOTES = [
  '자네의 무지를 아는 것,\n그것이 지혜의 시작이라네.',
  '검증되지 않은 삶은 살 가치가 없다네.',
  '진정한 지혜는 자신이 모른다는 것을 아는 데 있다네.',
  '자네 안에 이미 답이 있었다네. 잘 싸워보게.',
  '강한 주장일수록 더 강한 반론을 견뎌야 한다네.',
]

// ===== 아바타 =====
const SOCRATES_BASE = {
  top: ['sides'],
  hairColor: ['e8e1e1'],
  skinColor: ['ffdbb4'],
  facialHair: ['beardMajestic'],
  facialHairColor: ['e8e1e1'],
  facialHairProbability: 100,
  eyes: ['closed'],
  eyebrows: ['unibrowNatural'],
  clothing: ['shirtVNeck'],
  clothesColor: ['929598'],
  accessoriesProbability: 0,
}

let _socratesMouths = null
function getSocratesMouths() {
  if (!_socratesMouths) {
    _socratesMouths = ['serious', 'default', 'twinkle', 'smile'].map(m =>
      createAvatar(avataaars, { ...SOCRATES_BASE, mouth: [m] }).toDataUri()
    )
  }
  return _socratesMouths
}

let _socratesBlink = null
function getSocratesBlink() {
  if (!_socratesBlink) {
    _socratesBlink = [
      createAvatar(avataaars, { ...SOCRATES_BASE, eyes: ['closed'], mouth: ['serious'] }).toDataUri(),
      createAvatar(avataaars, { ...SOCRATES_BASE, eyes: ['default'], mouth: ['serious'] }).toDataUri(),
    ]
  }
  return _socratesBlink
}

const TALK_PATTERN = [0, 1, 2, 3, 2, 1, 0, 2, 3, 1, 0, 1, 3, 2, 0, 3]
const BLINK_TIMINGS = [150, 2000, 150, 3000, 150, 1500, 150, 2500]

let _socratesOpenMouths = null
function getSocratesOpenMouths() {
  if (!_socratesOpenMouths) {
    _socratesOpenMouths = ['serious', 'default', 'twinkle', 'smile'].map(m =>
      createAvatar(avataaars, { ...SOCRATES_BASE, eyes: ['default'], mouth: [m] }).toDataUri()
    )
  }
  return _socratesOpenMouths
}

let _socratesOpenIdle = null
function getSocratesOpenIdle() {
  if (!_socratesOpenIdle) {
    _socratesOpenIdle = createAvatar(avataaars, { ...SOCRATES_BASE, eyes: ['default'], mouth: ['default'] }).toDataUri()
  }
  return _socratesOpenIdle
}

function SocratesTalking({ speed = null, blink = false, eyesOpen = false }) {
  const mouths = getSocratesMouths()
  const blinkFrames = getSocratesBlink()
  const [frameIdx, setFrameIdx] = useState(0)
  const [blinkIdx, setBlinkIdx] = useState(0)

  useEffect(() => {
    if (!speed) { setFrameIdx(0); return }
    const interval = speed === 'slow' ? 333 : 125
    let i = 0
    let timer
    const next = () => {
      i = (i + 1) % TALK_PATTERN.length
      setFrameIdx(TALK_PATTERN[i])
      timer = setTimeout(next, interval + (Math.random() * 40 - 20))
    }
    timer = setTimeout(next, interval)
    return () => clearTimeout(timer)
  }, [speed])

  useEffect(() => {
    if (!blink) { setBlinkIdx(0); return }
    let i = 0
    let timer
    const next = () => {
      i = (i + 1) % BLINK_TIMINGS.length
      setBlinkIdx(i % 2)
      timer = setTimeout(next, BLINK_TIMINGS[i])
    }
    timer = setTimeout(next, BLINK_TIMINGS[0])
    return () => clearTimeout(timer)
  }, [blink])

  if (eyesOpen && speed) {
    const openMouths = getSocratesOpenMouths()
    return (
      <div className="w-9 h-9 rounded-full bg-[#1B2A4A] flex-shrink-0 overflow-hidden relative">
        {openMouths.map((src, i) => (
          <img key={i} src={src} alt="" className="absolute inset-0 w-full h-full"
            style={{ zIndex: i === frameIdx ? 1 : 0 }} />
        ))}
      </div>
    )
  }

  if (eyesOpen) {
    return (
      <div className="w-9 h-9 rounded-full bg-[#1B2A4A] flex-shrink-0 overflow-hidden">
        <img src={getSocratesOpenIdle()} alt="" className="w-full h-full" />
      </div>
    )
  }

  if (blink) {
    return (
      <div className="w-9 h-9 rounded-full bg-[#1B2A4A] flex-shrink-0 overflow-hidden relative">
        {blinkFrames.map((src, i) => (
          <img key={i} src={src} alt="" className="absolute inset-0 w-full h-full"
            style={{ zIndex: i === blinkIdx ? 1 : 0 }} />
        ))}
      </div>
    )
  }

  return (
    <div className="w-9 h-9 rounded-full bg-[#1B2A4A] flex-shrink-0 overflow-hidden relative">
      {mouths.map((src, i) => (
        <img key={i} src={src} alt="" className="absolute inset-0 w-full h-full"
          style={{ zIndex: i === frameIdx ? 1 : 0 }} />
      ))}
    </div>
  )
}

// ===== 타이핑 애니메이션 =====
function TypeWriter({ text, speed = 30, className = '', erasing = false, onEraseComplete, onComplete }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (erasing) {
      let i = text.length
      setDisplayed(text)
      setDone(false)
      const eraseSpeed = Math.max(speed / 2, 20)
      const timer = setInterval(() => {
        i = Math.max(0, i - 3)
        setDisplayed(text.slice(0, i))
        if (i <= 0) { clearInterval(timer); setDone(true); onEraseComplete?.() }
      }, eraseSpeed)
      return () => clearInterval(timer)
    }
    setDisplayed('')
    setDone(false)
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(timer); setDone(true); onComplete?.() }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed, erasing])

  return (
    <span className={className}>
      {displayed}
      {!done && <span className="inline-block w-[2px] h-[14px] bg-current ml-[1px] align-middle animate-pulse" />}
    </span>
  )
}

// ===== 메인 위젯 =====
export default function SocratesWidget({ topic, round, side, proSide, conSide, activeContent, opponentArg }) {
  const { feedback, isLoading: feedbackLoading, remaining, requestFeedback } =
    useSocraticFeedback({ topic, round, side })

  const [phase, setPhase] = useState(PHASES.idle)
  const farewellTimerRef = useRef(null)
  const farewellQuote = useMemo(() => FAREWELL_QUOTES[Math.floor(Math.random() * FAREWELL_QUOTES.length)], [round])

  // feedback 도착 → loading 중이면 지우기 시작
  useEffect(() => {
    if (feedback && phase === PHASES.loading) {
      setPhase(PHASES.loadingErasing)
    }
  }, [feedback, phase])

  // round 변경 시 리셋
  useEffect(() => {
    setPhase(prev => prev === PHASES.gone ? PHASES.gone : PHASES.idle)
    return () => clearTimeout(farewellTimerRef.current)
  }, [round])

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    if (feedbackLoading) return
    if (phase === PHASES.idleErasing || phase === PHASES.loadingErasing || phase === PHASES.dismissing || phase === PHASES.farewell) return
    if (!activeContent || activeContent.trim().length < 10) return

    if (remaining <= 0 && (phase === PHASES.showing || phase === PHASES.talking)) {
      setPhase(PHASES.farewell)
      return
    }

    if (phase === PHASES.showing || phase === PHASES.talking) {
      setPhase(PHASES.dismissing)
      return
    }
    if (phase === PHASES.idle) {
      setPhase(PHASES.idleErasing)
    }
  }, [phase, feedbackLoading, activeContent, remaining])

  // "소크라테스를 부르시겠습니까?" 지우기 완료 → API 호출
  const handleIdleEraseComplete = useCallback(() => {
    setPhase(PHASES.loading)
    requestFeedback(activeContent, opponentArg, proSide, conSide)
  }, [activeContent, opponentArg, requestFeedback])

  // 기존 질문 지우기 완료 → API 호출
  const handleDismissEraseComplete = useCallback(() => {
    setPhase(PHASES.loading)
    requestFeedback(activeContent, opponentArg, proSide, conSide)
  }, [activeContent, opponentArg, requestFeedback])

  const isVisible = round > 0 && activeContent?.trim().length >= 10 && phase !== PHASES.gone && (remaining > 0 || feedback || phase === PHASES.farewell)
  const isBusy = phase === PHASES.loading || phase === PHASES.loadingErasing || phase === PHASES.idleErasing || phase === PHASES.dismissing

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: [0, -15, 120], opacity: [1, 1, 0], scale: [1, 1.03, 0.85] }}
          transition={{ exit: { duration: 0.7, times: [0, 0.3, 1], ease: 'easeIn' }, type: 'spring', damping: 22, stiffness: 280 }}
          className="fixed bottom-16 left-0 right-0 z-40 px-4 max-w-md mx-auto"
        >
          <button
            onClick={handleClick}
            disabled={feedbackLoading}
            className={`w-full bg-[#1B2A4A]/80 backdrop-blur-sm rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 border border-[#D4AF37]/15 transition-transform overflow-hidden ${
              !feedbackLoading && !isBusy ? 'active:scale-[0.95] cursor-pointer' : ''
            }`}
          >
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <SocratesTalking
                speed={phase === PHASES.talking ? 'fast' : null}
                blink={phase === PHASES.loading || phase === PHASES.loadingErasing}
                eyesOpen={phase === PHASES.talking || phase === PHASES.showing}
              />
              <span className="text-[8px] font-bold text-[#D4AF37]">소크라테스</span>
            </div>
            <div className="flex flex-col-reverse gap-[2px] flex-shrink-0">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-[4px] h-[5px] rounded-[1px]"
                  style={{ backgroundColor: i < remaining ? '#D4AF37' : 'rgba(255,255,255,0.1)' }}
                />
              ))}
            </div>

            <div className="flex-1 min-w-0">
              {phase === PHASES.loadingErasing ? (
                <TypeWriter
                  key="loading-erase"
                  text="소크라테스가 생각중입니다..."
                  className="text-[13px] font-bold text-white/40"
                  speed={30}
                  erasing
                  onEraseComplete={() => setPhase(PHASES.talking)}
                />
              ) : phase === PHASES.loading ? (
                <TypeWriter key="loading" text="소크라테스가 생각중입니다..." className="text-[13px] font-bold text-white/40" speed={30} />
              ) : phase === PHASES.dismissing && feedback ? (
                <TypeWriter
                  key="erasing"
                  text={feedback.question}
                  className="text-[13px] leading-[1.5] text-white/80 font-bold"
                  speed={30}
                  erasing
                  onEraseComplete={handleDismissEraseComplete}
                />
              ) : phase === PHASES.farewell ? (
                <TypeWriter
                  key="farewell"
                  text={farewellQuote}
                  className="text-[13px] leading-[1.5] text-white/60 font-bold whitespace-pre-wrap"
                  speed={30}
                  onComplete={() => {
                    clearTimeout(farewellTimerRef.current)
                    farewellTimerRef.current = setTimeout(() => setPhase(PHASES.gone), 3000)
                  }}
                />
              ) : (phase === PHASES.talking || phase === PHASES.showing) && feedback ? (
                <TypeWriter
                  key={feedback.question}
                  text={feedback.question}
                  className="text-[13px] leading-[1.5] text-white/80 font-bold"
                  speed={30}
                  onComplete={() => phase === PHASES.talking && setPhase(PHASES.showing)}
                />
              ) : phase === PHASES.idleErasing ? (
                <TypeWriter
                  key="idle-erase"
                  text="소크라테스를 부르시겠습니까?"
                  className="text-[13px] font-bold text-white/50"
                  speed={40}
                  erasing
                  onEraseComplete={handleIdleEraseComplete}
                />
              ) : (
                <>
                  <TypeWriter text="소크라테스를 부르시겠습니까?" className="text-[13px] font-bold text-white/50" speed={40} />
                  <p className="text-[10px] text-white/25 mt-0.5">AI가 주장의 논리적 허점을 질문으로 짚어줍니다</p>
                </>
              )}
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
