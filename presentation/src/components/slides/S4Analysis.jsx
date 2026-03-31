import { useEffect, useRef } from 'react'
import Slide from '../Slide'
import Footer from '../Footer'
import { initCountUps } from '../../utils/animations'
import '../../styles/slide4.css'

const TOTAL_STEPS = 4 // bridge + 3 cards

export default function S4Analysis({ active, stepIndex, advanceStep }) {
  const ref = useRef(null)

  // 슬라이드별 스텝 수 등록
  useEffect(() => {
    // navigator에 스텝 수를 알리기 위해 DOM 속성 사용
    if (ref.current) {
      ref.current.closest('.slide')?.setAttribute('data-steps', TOTAL_STEPS)
    }
  }, [])

  // 카운트업 초기화
  useEffect(() => {
    if (active && ref.current) {
      initCountUps(ref.current, 800)
    }
  }, [active])

  const collapsed = stepIndex >= 1

  const stepStyle = (idx) => ({
    opacity: stepIndex > idx ? 1 : 0,
    transform: stepIndex > idx ? 'translateY(0)' : 'translateY(24px)',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
    pointerEvents: stepIndex > idx ? 'auto' : 'none',
  })

  const bridgeStyle = {
    opacity: stepIndex >= 1 ? 1 : 0,
    transition: 'opacity 0.5s ease',
    pointerEvents: stepIndex >= 1 ? 'auto' : 'none',
  }

  return (
    <Slide id="s4" active={active}>
      <div className="s-wrap" ref={ref}>
        <div className="next-hint">03 해결 전략 →</div>

        <div className="header">
          <span className="page-num">02</span>
          <span className="header-title">원인 분석</span>
        </div>

        {/* 중앙 텍스트 → 스텝1에서 좌측 축소 이동 */}
        <div className={`source-header${collapsed ? ' collapsed' : ''}`} id="s4-source">
          <span className="source-main">한국 사회는 갈등으로 가득하다</span><br />
          <span className="source-sub">(5대 사회갈등 심각 인식 — 74%)</span>
        </div>

        {/* 스텝1: 수평 화살표 + 우측 텍스트 */}
        <div className="s4-bridge" style={bridgeStyle}>
          <div className="s4-arrow">
            <svg width="160" height="60" viewBox="0 0 160 60">
              <line x1="0" y1="30" x2="120" y2="30" stroke="var(--gold)" strokeWidth="2" strokeDasharray="6 4">
                <animate attributeName="stroke-dashoffset" values="0;-20" dur="1.5s" repeatCount="indefinite" />
              </line>
              <polygon points="115,12 155,30 115,48" fill="var(--gold)" opacity="0.7" />
            </svg>
          </div>
          <div className="s4-bridge-right">
            <span className="source-main">그 갈등은<br />논쟁으로 이어진다</span>
          </div>
        </div>

        {/* 스텝2~4: 카드 영역 */}
        <div className="cards">
          <div className="card" style={stepStyle(1)}>
            <div className="card-graphic">
              <div className="illust" style={{ overflow: 'hidden', borderRadius: '8px' }}>
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Noto Serif KR',serif", fontSize: '1.2rem', color: 'var(--marble-dim)', opacity: 0.3 }}>그래픽 1</span>
                </div>
              </div>
            </div>
            <div className="card-text">
              <div className="stat-num gold" data-count="0" data-suffix="%" />
              <div className="stat-label">내용 1</div>
            </div>
          </div>

          <div className="card" style={stepStyle(2)}>
            <div className="card-graphic">
              <div className="illust" style={{ overflow: 'hidden', borderRadius: '8px' }}>
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Noto Serif KR',serif", fontSize: '1.2rem', color: 'var(--marble-dim)', opacity: 0.3 }}>그래픽 2</span>
                </div>
              </div>
            </div>
            <div className="card-text">
              <div className="stat-num amber" data-count="0" data-suffix="%" />
              <div className="stat-label">내용 2</div>
            </div>
          </div>

          <div className="card" style={stepStyle(3)}>
            <div className="card-graphic">
              <div className="illust">
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Noto Serif KR',serif", fontSize: '1.2rem', color: 'var(--marble-dim)', opacity: 0.3 }}>그래픽 3</span>
                </div>
              </div>
            </div>
            <div className="card-text">
              <div className="stat-num red" data-count="0" data-suffix="%" />
              <div className="stat-label">내용 3</div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </Slide>
  )
}

S4Analysis.stepCount = TOTAL_STEPS
