import { useState, useEffect } from 'react'
import Slide from '../Slide'
import '../../styles/slide8.css'

const diffGroups = [
  {
    label: '차별성',
    items: [
      { title: '3사 AI 독립 병렬 판결', tag: '공정성' },
      { title: 'AI + 시민 복합 판결', tag: '균형' },
      { title: '5항목 정량 판결 기준', tag: '정량화' },
      { title: '3가지 게임 모드', tag: '접근성' },
    ],
  },
  {
    label: '경쟁 우위',
    items: [
      { title: 'AI 토픽 파싱 + 위자드', tag: 'UX' },
      { title: '3단계 콘텐츠 방어', tag: '안전' },
      { title: 'Socket.IO 양방향 통신', tag: '실시간' },
      { title: 'PWA 모바일 앱', tag: '모바일' },
    ],
  },
]
const allDiffs = diffGroups.flatMap(g => g.items)

export default function S8TechStack({ active, stepIndex = 0 }) {
  const [litCount, setLitCount] = useState(0)

  useEffect(() => {
    if (stepIndex === 0 && active) {
      setLitCount(0)
      let count = 0
      const timer = setInterval(() => {
        count++
        setLitCount(count)
        if (count >= allDiffs.length) clearInterval(timer)
      }, 350)
      return () => clearInterval(timer)
    }
    if (!active) setLitCount(0)
  }, [stepIndex, active])

  return (
    <Slide id="s8" active={active}>
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">09</span>
          <span className="header-title">차별점</span>
        </div>

        <div className="s8-diff-content">
          <div className="s8-diff-split">
            {diffGroups.map((group, gi) => {
              const offset = gi * 4
              return (
                <div className="s8-diff-group" key={gi}>
                  <div className="s8-section-tag">{group.label}</div>
                  <div className="s8-diff-list">
                    {group.items.map((d, i) => (
                      <div className={`s8-diff-card${offset + i < litCount ? ' lit' : ''}`} key={i}>
                        <div className="s8-diff-card-header">{d.tag}</div>
                        <div className="s8-diff-title">{d.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </Slide>
  )
}
