import { useState, useEffect } from 'react'
import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide9.css'

const STEP_COUNT = 1

const categories = [
  {
    label: '개인',
    items: [
      { title: '납득 가능한 패배', desc: '5항목 루브릭 점수로 패인을 객관적 확인' },
      { title: '구조화된 피드백', desc: '감정 싸움 대신 논리/근거 중심 논쟁으로 전환' },
      { title: '논증력 성장', desc: '5항목 점수 시각화로 강점/약점 파악 및 개선' },
    ],
  },
  {
    label: '사회',
    items: [
      { title: '논리 기반 공론장', desc: '감정적 여론 대신 근거 중심 건전한 토론 문화 형성' },
      { title: 'AI 공정성 검증 모델', desc: '3사 독립 판결 + 다수결로 AI 편향 구조적 완화' },
      { title: '시민 참여형 판결', desc: 'AI 75% + 시민 25% 하이브리드 의사결정' },
    ],
  },
  {
    label: '플랫폼',
    items: [
      { title: '토론 데이터 자산화', desc: '논제별 여론 분포 리포트 자동 생성' },
      { title: 'B2B 확장', desc: '기업 사내 의사결정 구조화 도구 제공' },
      { title: '유해 콘텐츠 방어', desc: '3단계 방어 시스템으로 플랫폼 건전성 유지' },
    ],
  },
]

const stages = [
  { step: '1단계 (현재)', title: '일상 논쟁', desc: '친구/연인/동료 간 의견 충돌을\nAI 판결로 객관적 해결' },
  { step: '2단계', title: '미디어 연계', desc: '유튜브/SNS 콘텐츠 소재 활용(바이럴)\n핫이슈 공식 토론장 개설' },
  { step: '3단계', title: 'B2B', desc: '사내 브레인스토밍 정책 결정 시\n찬-반 구조화 지원' },
  { step: '4단계', title: '교육 연계', desc: 'AI 5항목 평가기준 기반으로\n교육기관 논증력 평가\n논술/면접 훈련 도구' },
  { step: '5단계', title: '정책 공론화', desc: 'AI 분석 + 시민 투표 데이터로 여론 파악' },
]

function S9Effects({ active, stepIndex = 0 }) {
  const [litCols, setLitCols] = useState(0)
  const [litStages, setLitStages] = useState(0)

  useEffect(() => {
    if (active && stepIndex === 0) {
      setLitCols(0)
      setLitStages(0)
      let count = 0
      const timer = setInterval(() => {
        count++
        setLitCols(count)
        if (count >= categories.length) clearInterval(timer)
      }, 400)
      return () => clearInterval(timer)
    }
    if (active && stepIndex >= 1) {
      setLitCols(categories.length)
      setLitStages(0)
      let count = 0
      const timer = setInterval(() => {
        count++
        setLitStages(count)
        if (count >= stages.length) clearInterval(timer)
      }, 350)
      return () => clearInterval(timer)
    }
    setLitCols(0)
    setLitStages(0)
  }, [active, stepIndex])

  return (
    <Slide id="s9" active={active}>
      <div className="s9-wrap">
        <div className="s9-header">
          <span className="page-num">07</span>
          <span className="header-title">기대효과 및 활용방안</span>
        </div>

        <div className={`s9-top${stepIndex >= 1 ? ' dim' : ''}`}>
          <div className="s9-section-tag">기대효과</div>
          <div className="s9-cols">
            {categories.map((cat, ci) => (
              <div className={`s9-col${ci < litCols ? ' lit' : ''}`} key={ci}>
                <div className="s9-col-label">{cat.label}</div>
                <div className="s9-col-items">
                  {cat.items.map((item, ii) => (
                    <div className="s9-item" key={ii}>
                      <div className="s9-item-title">{item.title}</div>
                      <div className="s9-item-desc">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="s9-divider" />

        <div className={`s9-bottom${stepIndex >= 1 ? ' focus' : ''}`}>
          <div className="s9-section-tag">활용방안 — 확장 시나리오</div>
          <div className="s9-stages">
            <div className="s9-stage-bar">
              {stages.map((s, i) => (
                <div className={`s9-stage-label${i < litStages ? ' lit' : ''}`} key={i}>
                  {s.step}
                  {i < stages.length - 1 && <div className="s9-stage-arrow" />}
                </div>
              ))}
            </div>
            <div className="s9-stage-cards">
              {stages.map((s, i) => (
                <div className={`s9-stage-card${i < litStages ? ' lit' : ''}`} key={i}>
                  <div className="s9-stage-title">{s.title}</div>
                  <div className="s9-stage-desc">{s.desc}</div>
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

S9Effects.stepCount = STEP_COUNT

export default S9Effects
