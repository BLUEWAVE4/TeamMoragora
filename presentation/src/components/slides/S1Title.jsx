import { useEffect, useRef } from 'react'
import Slide from '../Slide'
import '../../styles/slide1.css'

export default function S1Title({ active }) {
  const particlesRef = useRef(null)
  const builtRef = useRef(false)

  useEffect(() => {
    if (!active || builtRef.current) return
    builtRef.current = true
    const c = particlesRef.current
    if (!c) return
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div')
      p.className = 's1-particle'
      const x = Math.random() * 100
      const dur = 7 + Math.random() * 12
      const delay = Math.random() * 5
      const drift = (Math.random() - 0.5) * 50
      const size = 1.5 + Math.random() * 2.5
      p.style.cssText = `left:${x}vw;bottom:${Math.random() * 15}vh;--drift:${drift}px;animation-duration:${dur}s;animation-delay:${delay}s;width:${size}px;height:${size}px;`
      c.appendChild(p)
    }
  }, [active])

  return (
    <Slide id="s1" active={active}>
      {/* 배경 레이어 */}
      <div className="s1-columns">
        <div className="s1-col" /><div className="s1-col" />
        <div className="s1-col" /><div className="s1-col" />
      </div>
      <div ref={particlesRef} className="s1-particles" />

      {/* 메인 콘텐츠 — 중앙 배치 */}
      <div className="s1-center">
        {/* 상단 장식선 */}
        <div className="s1-deco-top">
          <div className="s1-deco-line" />
          <div className="s1-deco-diamond" />
          <div className="s1-deco-line right" />
        </div>

        {/* 타이틀 */}
        <h1 className="title">모라고라<span className="title-dot">.</span></h1>

        {/* 구분선 */}
        <div className="s1-divider">
          <div className="s1-div-line" />
          <div className="s1-div-dot" />
          <div className="s1-div-line right" />
        </div>

        {/* 서브타이틀 */}
        <p className="subtitle">
          <span className="subtitle-gold">논쟁의 마침표</span>를 위한
        </p>
        <p className="subtitle-sub">AI 복합 판결 서비스</p>

        {/* 하단 장식선 */}
        <div className="s1-deco-bottom">
          <div className="s1-deco-line" />
          <span className="s1-deco-omega">Ω</span>
          <div className="s1-deco-line right" />
        </div>
      </div>

      {/* 팀원 — 하단 중앙 */}
      <div className="s1-team">
        <div className="team-names">
          <span className="team-name">김선관</span>
          <span className="team-name">서우주</span>
          <span className="team-name">김준민</span>
          <span className="team-name">채유진</span>
        </div>
      </div>

    </Slide>
  )
}
