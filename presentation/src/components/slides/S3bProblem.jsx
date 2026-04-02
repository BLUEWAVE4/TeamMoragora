import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Slide from '../Slide'
import typingSfx from '../../assets/sounds/키보드 타이핑 소리.mp3'
import '../../styles/slide3b.css'

const asIs = [
  { title: '중립적 판단자 부재' },
  { title: '감정적 편향' },
  { title: '다수결의 한계' },
]

const toBe = [
  { title: 'AI 3사 독립 분석·판결' },
  { title: '근거 기반 판결문 제공' },
  { title: 'AI + 시민 복합 판결' },
]

function Card({ item, variant, index, active }) {
  return (
    <motion.div
      className={`s3b-card ${variant}`}
      initial={{ opacity: 0, x: -40 }}
      animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 + index * 0.12 }}
    >
      <span className="s3b-card-title">{item.title}</span>
    </motion.div>
  )
}

const CORE_TEXT = '객관적 중재자의 부재'
const TYPE_SPEED = 100

export default function S3bProblem({ active, stepIndex = 0 }) {
  const [typed, setTyped] = useState('')
  const [showCursor, setShowCursor] = useState(false)
  const [showUnderline, setShowUnderline] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    if (stepIndex < 3) { setTyped(''); setShowCursor(false); setShowUnderline(false); return }
    setShowCursor(true)
    setShowUnderline(false)

    // 타이핑 효과음 재생
    const audio = new Audio(typingSfx)
    audio.volume = 0.4
    audio.play().catch(() => {})
    audioRef.current = audio

    let i = 0
    const timer = setInterval(() => {
      i++
      setTyped(CORE_TEXT.slice(0, i))
      if (i >= CORE_TEXT.length) {
        clearInterval(timer)
        // 타이핑 끝나면 효과음 페이드아웃
        if (audioRef.current) {
          const fadeOut = setInterval(() => {
            if (audioRef.current.volume > 0.05) {
              audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.05)
            } else {
              audioRef.current.pause()
              clearInterval(fadeOut)
            }
          }, 50)
        }
        setTimeout(() => { setShowCursor(false); setShowUnderline(true) }, 600)
      }
    }, TYPE_SPEED)
    return () => {
      clearInterval(timer)
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    }
  }, [stepIndex])

  return (
    <Slide id="s3b" active={active}>
      {/* 스포트라이트 오버레이 — step 2부터 */}
      <div className={`s3b-spotlight${stepIndex >= 2 ? ' visible' : ''}`} />

      <div className="s-wrap">
        {/* ── 헤더 ── */}
        <div className={`header${stepIndex >= 2 ? ' s3b-hide' : ''}`}>
          <span className="page-num">02</span>
          <span className="header-title">문제 정의</span>
        </div>

        {/* ── 콘텐츠 영역: body와 core가 같은 자리에 겹침 ── */}
        <div className="s3b-stage">
          {/* As-Is → To-Be (step 0~1) */}
          <div className={`s3b-body${stepIndex >= 2 ? ' hidden' : ''}`}>
            <div className={`s3b-col${stepIndex >= 0 ? ' visible' : ''}${stepIndex >= 1 ? ' dimmed' : ''}`}>
              <div className="s3b-col-label as-is">As-Is · 현재 상태</div>
              <div className="s3b-card-list">
                {asIs.map((item, i) => (
                  <Card item={item} variant="as-is" index={i} key={i} active={active} />
                ))}
                <div className="s3b-spacer" />
              </div>
            </div>

            <div className={`s3b-arrow${stepIndex >= 1 ? ' visible' : ''}`}>
              <svg viewBox="0 0 80 80" fill="none">
                <path d="M30 20 L50 40 L30 60" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
              </svg>
            </div>

            <div className={`s3b-col${stepIndex >= 1 ? ' visible' : ''}`}>
              <div className="s3b-col-label to-be">To-Be · 목표 상태</div>
              <div className="s3b-card-list">
                {toBe.map((item, i) => (
                  <Card item={item} variant="to-be" index={i} key={i} active={active} />
                ))}
                <div className="s3b-spacer" />
              </div>
            </div>
          </div>

          {/* Core — step 2: 라벨만(크게), step 3: 라벨+타이핑 */}
          <div className={`s3b-core${stepIndex >= 2 ? ' visible' : ''}`}>
            <span className={`s3b-core-label${stepIndex === 2 ? ' solo' : ''}`}>핵심 문제</span>
            {stepIndex >= 3 && (
              <span className="s3b-core-title">
                {typed}
                {showCursor && <span className="s3b-cursor" />}
              </span>
            )}
          </div>
        </div>

        <div className={`s3b-footer-wrap${stepIndex >= 2 ? ' s3b-hide' : ''}`}>
        </div>
      </div>
    </Slide>
  )
}

S3bProblem.stepCount = 3
