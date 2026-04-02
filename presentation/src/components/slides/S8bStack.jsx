import Slide from '../Slide'
import '../../styles/slide8.css'

const techRows = [
  { layer: 'Frontend', color: 'fe', items: ['React 19 + Vite 6', 'Tailwind CSS 4', 'Zustand', 'Framer Motion', 'Chart.js', 'PWA'] },
  { layer: 'Backend', color: 'be', items: ['Express.js (Node)', 'Socket.IO', 'Supabase JS'] },
  { layer: 'DB · Auth', color: 'db', items: ['Supabase (PostgreSQL + RLS)', 'OAuth 2.0 (카카오 · 구글)'] },
  { layer: 'AI', color: 'ai', items: ['GPT-4o', 'Gemini 2.5 Flash', 'Claude Sonnet 4', 'Grok 3-mini (fallback)'] },
  { layer: 'Infra', color: 'dp', items: ['Vercel (FE)', 'Render (BE)', 'GitHub Actions'] },
  { layer: 'Features', color: 'ft', items: ['PWA 설치', 'OG 소셜 공유', 'Analytics'] },
]

export default function S8bStack({ active }) {
  return (
    <Slide id="s8b-stack" active={active}>
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">06</span>
          <span className="header-title">기술 스택</span>
        </div>

        <div className="s8-stack-content">
          <div className="s8-stack">
            {techRows.map((row, i) => (
              <div className={`s8-stack-row ${row.color}`} key={i} style={{ animationDelay: `${0.3 + i * 0.12}s` }}>
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
    </Slide>
  )
}
