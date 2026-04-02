import { useState, useEffect } from 'react'
import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide8.css'

const diffs = [
  { title: '3사 AI 독립 병렬 판결', tag: '공정성' },
  { title: 'AI + 시민 복합 판결', tag: '균형' },
  { title: '5항목 정량 판결 기준', tag: '정량화' },
  { title: '3가지 게임 모드', tag: '접근성' },
  { title: 'AI 토픽 파싱 + 위자드', tag: 'UX' },
  { title: '3단계 콘텐츠 방어(비속어-AI검증-주제검증)', tag: '안전' },
  { title: 'Socket.IO(양방향 통신)', tag: '실시간' },
  { title: 'PWA(앱)', tag: '모바일' },
]

const techRows = [
  { layer: 'Frontend', color: 'fe', items: ['React 19 + Vite 6', 'Tailwind CSS 4', 'Zustand', 'Framer Motion', 'Chart.js', 'PWA'] },
  { layer: 'Backend', color: 'be', items: ['Express.js (Node)', 'Socket.IO', 'Supabase JS'] },
  { layer: 'DB · Auth', color: 'db', items: ['Supabase (PostgreSQL + RLS)', 'OAuth 2.0 (카카오 · 구글)'] },
  { layer: 'AI', color: 'ai', items: ['GPT-4o', 'Gemini 2.5 Flash', 'Claude Sonnet 4', 'Grok 3-mini (fallback)'] },
  { layer: 'Infra', color: 'dp', items: ['Vercel (FE)', 'Render (BE)', 'GitHub Actions'] },
  { layer: 'Features', color: 'ft', items: ['PWA 설치', 'OG 소셜 공유', 'Analytics'] },
]

export default function S8TechStack({ active, stepIndex = 0 }) {
  const [litCount, setLitCount] = useState(0)

  useEffect(() => {
    if (stepIndex === 0 && active) {
      setLitCount(0)
      let count = 0
      const timer = setInterval(() => {
        count++
        setLitCount(count)
        if (count >= diffs.length) clearInterval(timer)
      }, 350)
      return () => clearInterval(timer)
    }
    if (!active) setLitCount(0)
  }, [stepIndex, active])

  // step0: 좌측만 밝게, step1: 우측만 밝게
  const leftLit = stepIndex === 0
  const rightLit = stepIndex === 1

  return (
    <Slide id="s8" active={active}>
      <div className="s8-wrap">
        <div className="s8-header">
          <span className="page-num">06</span>
          <span className="header-title">차별점 & 기술 스택</span>
        </div>

        <div className="s8-body">
          {/* 좌측: 차별점 */}
          <div className={`s8-left${leftLit ? ' lit' : ''}`}>
            <div className="s8-section-tag">차별성 & 경쟁 우위</div>
            <div className="s8-diff-list">
              {diffs.map((d, i) => (
                <div className={`s8-diff-card${leftLit && i < litCount ? ' lit' : ''}`} key={i}>
                  <div className="s8-diff-card-header">{d.tag}</div>
                  <div className="s8-diff-title">{d.title}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 우측: 기술 스택 */}
          <div className={`s8-right${rightLit ? ' lit' : ''}`}>
            <div className="s8-section-tag">기술 스택</div>
            <div className="s8-stack">
              {techRows.map((row, i) => (
                <div className={`s8-stack-row ${row.color}`} key={i}>
                  <div className="s8-layer-label">{row.layer}</div>
                  <div className="s8-layer-items">
                    {row.items.map((item, j) => (
                      <span className="s8-tech-chip" key={j}>{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Footer delay={2} />
      </div>
    </Slide>
  )
}

S8TechStack.stepCount = 1
