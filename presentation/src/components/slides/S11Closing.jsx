import { useEffect, useRef, useState } from 'react'
import Slide from '../Slide'
import typingSfx from '../../assets/sounds/키보드 타이핑 소리.mp3'
import '../../styles/slide11.css'

const WORD = '모라고라'
const TYPE_SPEED = 120
const DELETE_SPEED = 60

export default function S11Closing({ active }) {
  const particlesRef = useRef(null)
  const builtRef = useRef(false)
  const [typed, setTyped] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [phase, setPhase] = useState(0) // 0:wait 1:typing? 2:pause 3:delete? 4:type. 5:done

  // 파티클 생성
  useEffect(() => {
    if (!active || builtRef.current) return
    builtRef.current = true
    const c = particlesRef.current
    if (!c) return
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div')
      p.className = 'sp-particle'
      const x = Math.random() * 100
      const dur = 6 + Math.random() * 10
      const delay = Math.random() * 6
      const drift = (Math.random() - 0.5) * 60
      const size = 1 + Math.random() * 2
      p.style.cssText = `left:${x}vw;bottom:${Math.random() * 20}vh;--drift:${drift}px;animation-duration:${dur}s;animation-delay:${delay}s;width:${size}px;height:${size}px;`
      c.appendChild(p)
    }
  }, [active])

  // 타이핑 애니메이션
  useEffect(() => {
    if (!active) { setTyped(''); setPhase(0); setShowCursor(true); return }
    // 1.5초 후 타이핑 시작
    const startTimer = setTimeout(() => setPhase(1), 1500)
    return () => clearTimeout(startTimer)
  }, [active])

  useEffect(() => {
    if (phase === 0) return
    let timer
    if (phase === 1) {
      // "모라고라?" 타이핑 + 효과음
      const audio = new Audio(typingSfx)
      audio.volume = 0.4
      audio.play().catch(() => {})
      const target = WORD + '?'
      let i = 0
      timer = setInterval(() => {
        i++
        setTyped(target.slice(0, i))
        if (i >= target.length) {
          clearInterval(timer)
          // 효과음 페이드아웃
          const fadeOut = setInterval(() => {
            if (audio.volume > 0.05) {
              audio.volume = Math.max(0, audio.volume - 0.05)
            } else {
              audio.pause()
              clearInterval(fadeOut)
            }
          }, 50)
          setPhase(2)
        }
      }, TYPE_SPEED)
    } else if (phase === 2) {
      // 1.5초 대기
      timer = setTimeout(() => setPhase(3), 1500)
    } else if (phase === 3) {
      // "?" 삭제
      timer = setTimeout(() => { setTyped(WORD); setPhase(4) }, DELETE_SPEED)
    } else if (phase === 4) {
      // "." 추가 → 색상 전환
      timer = setTimeout(() => { setTyped(WORD + '.'); setShowCursor(false); setPhase(5) }, 400)
    } else if (phase === 5) {
      // 3초 유지 후 감사합니다 전환
      timer = setTimeout(() => setPhase(6), 3000)
    }
    return () => { clearInterval(timer); clearTimeout(timer) }
  }, [phase])

  return (
    <Slide id="s11" active={active}>
      <div className={`sp-scene${phase === 6 ? ' gathered' : ''}`}>
      {/* 배경 레이어 */}
      <div className="sp-bg-layer" />
      <div className="sp-vignette" />
      <div className="sp-columns">
        <div className="sp-col" /><div className="sp-col" /><div className="sp-col" /><div className="sp-col" />
      </div>
      <div ref={particlesRef} className="sp-particles-wrap" />

      {/* 메인 콘텐츠 */}
      <div className="sp-main">
        <div className="sp-epigraph">
          &nbsp;&nbsp;&nbsp;&nbsp;Ἡ ἀλήθεια ἐν τῷ λόγῳ
          <span className="sp-ep-dash"> — </span>
          <br className="sp-ep-br" />
          Truth lives in argument
        </div>

        <div className="sp-divider-top">
          <div className="sp-div-line" />
          <div className="sp-diamond" />
          <div className="sp-div-line right" />
        </div>

        <div className="sp-logo-v">
          <svg viewBox="0 0 120 100" style={{ width: '1em', height: '0.83em', verticalAlign: 'baseline' }}>
            <defs>
              <linearGradient id="s11-gold-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f0c96a" />
                <stop offset="40%" stopColor="#c9a84c" />
                <stop offset="100%" stopColor="#8a6a20" />
              </linearGradient>
            </defs>
            <polygon points="60,8 56,16 64,16" fill="url(#s11-gold-grad)" />
            <rect x="58" y="16" width="4" height="12" fill="url(#s11-gold-grad)" />
            <rect x="12" y="26" width="96" height="3" rx="1" fill="url(#s11-gold-grad)" />
            <line x1="18" y1="29" x2="10" y2="62" stroke="url(#s11-gold-grad)" strokeWidth="2.5" />
            <line x1="18" y1="29" x2="26" y2="62" stroke="url(#s11-gold-grad)" strokeWidth="2.5" />
            <path d="M6,62 Q18,78 30,62" stroke="url(#s11-gold-grad)" strokeWidth="2.5" fill="none" />
            <line x1="102" y1="29" x2="94" y2="62" stroke="url(#s11-gold-grad)" strokeWidth="2.5" />
            <line x1="102" y1="29" x2="110" y2="62" stroke="url(#s11-gold-grad)" strokeWidth="2.5" />
            <path d="M90,62 Q102,78 114,62" stroke="url(#s11-gold-grad)" strokeWidth="2.5" fill="none" />
            <rect x="58" y="28" width="4" height="50" fill="url(#s11-gold-grad)" />
            <rect x="46" y="78" width="28" height="3" rx="1" fill="url(#s11-gold-grad)" />
            <polygon points="52,78 60,68 68,78" fill="url(#s11-gold-grad)" />
          </svg>
        </div>

        <div className="sp-wordmark-wrap">
          <span className={`sp-wordmark${phase >= 5 ? ' gathered' : ''}`}>
            {typed.endsWith('.') ? (
              <><span className={`sp-wm-text${phase >= 5 ? ' gathered' : ''}`}>{WORD}</span><span className={`sp-wm-dot${phase >= 5 ? ' gathered' : ''}`}>.</span></>
            ) : typed}
          </span>
          {showCursor && <span className="sp-wm-cursor" />}
        </div>
        <div className="sp-subtitle-en">The Agora of Modern Debate</div>

        <div className="sp-divider-bottom">
          <div className="sp-div-line" />
          <div className="sp-omega">Ω</div>
          <div className="sp-div-line right" />
        </div>
      </div>

      {/* 감사합니다 오버레이 */}
      <div className="sp-thanks">
        <h1 className="sp-thanks-title">감사합니다</h1>
        <p className="sp-thanks-sub">
          논쟁의 마침표를 위한<br />
          <strong>AI 복합 판결 서비스, 모라고라</strong>
        </p>
        <div className="sp-thanks-qna">Q & A</div>
      </div>
      </div>
    </Slide>
  )
}
