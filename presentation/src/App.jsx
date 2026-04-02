import { useRef } from 'react'
import { useNavigator } from './hooks/useNavigator'
import Background from './components/Background'
import SlideCounter from './components/SlideCounter'
import S1Title from './components/slides/S1Title'
import S2Toc from './components/slides/S2Toc'
import S3Proposal from './components/slides/S3Proposal'
import S4Analysis from './components/slides/S4Analysis'
import S4bNeed from './components/slides/S4bNeed'
import S5Strategy from './components/slides/S5Strategy'
import S6Structure from './components/slides/S6Structure'
import S7Demo from './components/slides/S7Demo'
import S8TechStack from './components/slides/S8TechStack'
import S9Effects from './components/slides/S9Effects'
import S10Team from './components/slides/S10Team'

export default function App() {
  const slides = [
    S1Title, S2Toc, S3Proposal, S4Analysis, S4bNeed, S5Strategy,
    S6Structure, S7Demo, S8TechStack, S9Effects, S10Team,
  ]
  const { current, total, stepIndex, registerSteps, goTo } = useNavigator(slides.length)

  // 각 슬라이드가 마지막으로 보여준 stepIndex를 기억
  // → 전환 fade-out 중 step0로 깜빡이는 현상 방지
  const lastStepRef = useRef({})
  lastStepRef.current[current] = stepIndex

  // stepCount를 즉시 등록 (ref 기반이므로 렌더 중 호출 안전)
  for (let i = 0; i < slides.length; i++) {
    registerSteps(i, slides[i].stepCount || 0)
  }

  const slideLabels = [
    'Title', 'TOC', '제안배경', '원인분석', '필요성', '해결전략',
    '서비스구조', '기능시연', '차별점', '기대효과', '팀소개',
  ]

  return (
    <>
      <Background />
      <SlideCounter current={current} total={total} />
      {slides.map((SlideComponent, idx) => (
        <SlideComponent
          key={idx}
          active={idx === current}
          stepIndex={idx === current ? stepIndex : (lastStepRef.current[idx] ?? 0)}
        />
      ))}
      {/* 개발용 네비게이션 바 */}
      <nav className="dev-nav">
        {slideLabels.map((label, idx) => (
          <button
            key={idx}
            className={`dev-nav-btn${idx === current ? ' active' : ''}`}
            onClick={(e) => { e.stopPropagation(); goTo(idx); }}
          >
            {label}
          </button>
        ))}
      </nav>
    </>
  )
}
