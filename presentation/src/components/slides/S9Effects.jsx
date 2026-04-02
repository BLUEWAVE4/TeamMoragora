import { useState, useEffect } from 'react'
import Slide from '../Slide'
import '../../styles/slide9.css'


const categories = [
  {
    label: '개인', color: 'navy',
    items: [
      { title: '납득 가능한 패배' },
      { title: '구조화된 피드백' },
      { title: '논증력 성장' },
    ],
  },
  {
    label: '사회', color: 'teal',
    items: [
      { title: '논리 기반 공론장' },
      { title: 'AI 공정성 검증 모델' },
      { title: '시민 참여형 판결' },
    ],
  },
  {
    label: '플랫폼', color: 'gold',
    items: [
      { title: '토론 데이터 자산화' },
      { title: 'B2B 확장' },
      { title: '유해 콘텐츠 방어' },
    ],
  },
]

const stages = [
  { step: '1단계 (현재)', title: '일상 논쟁' },
  { step: '2단계', title: '미디어 연계' },
  { step: '3단계', title: 'B2B' },
  { step: '4단계', title: '교육 연계' },
  { step: '5단계', title: '정책 공론화' },
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
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">10</span>
          <span className="header-title">{stepIndex === 0 ? '기대효과' : '활용방안'}</span>
        </div>

        {/* step0: 기대효과 */}
        <div className={`s9-top${stepIndex === 0 ? ' visible' : ''}`}>
          <div className="s9-cols">
            {categories.map((cat, ci) => (
              <div className={`s9-col ${cat.color}${ci < litCols ? ' lit' : ''}`} key={ci}>
                <div className="s9-col-label">{cat.label}</div>
                <div className="s9-col-items">
                  {cat.items.map((item, ii) => (
                    <div className="s9-item" key={ii}>
                      <div className="s9-item-title">{item.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* step1: 활용방안 */}
        <div className={`s9-bottom${stepIndex >= 1 ? ' visible' : ''}`}>
          <div className="s9-stages">
            {stages.map((s, i) => (
              <div className={`s9-stage-item${i < litStages ? ' lit' : ''}`} key={i}>
                <div className="s9-stage-label">{s.step}</div>
                <div className="s9-stage-body">
                  <div className="s9-stage-title">{s.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Slide>
  )
}

S9Effects.stepCount = 1

export default S9Effects
