import { useState, useEffect } from 'react'
import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide8.css'

const diffs = [
  { num: '01', title: '3사 AI 독립 병렬 판결', desc: 'GPT-4o · Gemini · Claude 독립 채점\n교차 검증으로 편향 구조적 제거', tag: '공정성' },
  { num: '02', title: 'AI + 시민 복합 판결', desc: 'AI 75% + 시민 25% 결합\n하이브리드 판결 모델', tag: '균형' },
  { num: '03', title: '5항목 정량 루브릭', desc: '논리·근거·설득·일관·표현\n각 0~20점 데이터 기반 판결', tag: '정량화' },
  { num: '04', title: '3가지 게임 모드', desc: 'Solo(AI 코칭) · Duo(1v1)\nChat(실시간 3v3)', tag: '접근성' },
  { num: '05', title: 'AI 토픽 파싱 + 위자드', desc: '진영·카테고리·렌즈 자동 생성\n소크라테스 코칭', tag: 'UX' },
  { num: '06', title: '3단계 콘텐츠 방어', desc: '비속어 → AI 안전성 → 주제 적합성\n건전한 논쟁 환경 보장', tag: '안전' },
  { num: '07', title: '실시간 WebSocket', desc: 'Socket.IO 채팅·로비·투표\n실시간 사용자 프레즌스', tag: '실시간' },
  { num: '08', title: 'PWA 모바일 경험', desc: '앱 설치·오프라인 지원\nOG 메타태그 소셜 공유', tag: '모바일' },
]

const techRows = [
  { layer: 'Frontend', color: 'fe', items: ['React 19 + Vite 6', 'Tailwind CSS 4', 'Zustand', 'Framer Motion', 'Chart.js', 'PWA'] },
  { layer: 'Backend', color: 'be', items: ['Express.js (Node)', 'Socket.IO', 'Supabase JS'] },
  { layer: 'DB · Auth', color: 'db', items: ['Supabase (PostgreSQL + RLS)', 'OAuth 2.0 (카카오 · 구글)'] },
  { layer: 'AI', color: 'ai', items: ['GPT-4o', 'Gemini 2.5 Flash', 'Claude Sonnet 4', 'Grok 3-mini (fallback)'] },
  { layer: 'Infra', color: 'dp', items: ['Vercel (FE)', 'Render (BE)', 'GitHub Actions'] },
  { layer: 'Features', color: 'ft', items: ['PWA 설치', 'OG 소셜 공유', 'Analytics'] },
]

export default function S8TechStack({ active }) {
  const [litCount, setLitCount] = useState(0)

  useEffect(() => {
    if (active) {
      setLitCount(0)
      let count = 0
      const timer = setInterval(() => {
        count++
        setLitCount(count)
        if (count >= diffs.length) clearInterval(timer)
      }, 350)
      return () => clearInterval(timer)
    }
    setLitCount(0)
  }, [active])

  return (
    <Slide id="s8" active={active}>
      <div className="s8-wrap">
        <div className="s8-header">
          <span className="page-num">06</span>
          <span className="header-title">차별점 & 기술 스택</span>
        </div>

        <div className="s8-body">
          {/* 좌측: 차별점 */}
          <div className="s8-left">
            <div className="s8-section-tag">차별성 & 경쟁 우위</div>
            <div className="s8-diff-list">
              {diffs.map((d, i) => (
                <div className={`s8-diff-card${i < litCount ? ' lit' : ''}`} key={i}>
                  <div className="s8-diff-top">
                    <span className="s8-diff-num">{d.num}</span>
                    <span className="s8-diff-tag">{d.tag}</span>
                  </div>
                  <div className="s8-diff-title">{d.title}</div>
                  <div className="s8-diff-desc">{d.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 우측: 기술 스택 */}
          <div className="s8-right">
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
