import Slide from '../Slide'
import '../../styles/slide2.css'

const sections = [
  {
    label: 'WHY',
    sub: '왜 필요한가',
    items: [
      { num: '01', title: '제안 배경' },
      { num: '02', title: '문제 정의' },
      { num: '03', title: '서비스의 필요성' },
    ],
  },
  {
    label: 'HOW',
    sub: '어떻게 해결하는가',
    items: [
      { num: '04', title: '해결 전략' },
      { num: '05', title: '서비스 구조' },
      { num: '06', title: '핵심 기능 시연' },
      { num: '07', title: '핵심 기술' },
      { num: '08', title: '트러블 슈팅' },
    ],
  },
  {
    label: 'WHAT',
    sub: '무엇을 이루었는가',
    items: [
      { num: '09', title: '차별점' },
      { num: '10', title: '기대효과' },
      { num: '11', title: '활용방안' },
      { num: '12', title: '팀 소개' },
    ],
  },
]

export default function S2Toc({ active }) {
  return (
    <Slide id="s2" active={active}>
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">00</span>
          <div className="header-title">목차</div>
        </div>
        <div className="toc-3col">
          {sections.map((sec, si) => (
            <div className="toc-section" key={si} style={{ animationDelay: `${0.5 + si * 0.2}s` }}>
              <div className="toc-section-header">
                <div className="toc-section-label">{sec.label}</div>
                <div className="toc-section-sub">{sec.sub}</div>
              </div>
              <div className="toc-section-items">
                {sec.items.map((item, ii) => (
                  <div className="toc-item" key={ii} style={{ animationDelay: `${0.7 + si * 0.2 + ii * 0.1}s` }}>
                    <span className="item-num">{item.num}</span>
                    <span className="item-title">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  )
}
