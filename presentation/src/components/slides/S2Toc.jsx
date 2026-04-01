import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide2.css'

const items = [
  { num: '01', title: '제안 배경', page: '3p', dataI: '03' },
  { num: '02', title: '원인 분석', page: '4p', dataI: '04' },
  { num: '03', title: '서비스의 필요성', page: '5p', dataI: '05' },
  { num: '04', title: '해결 전략', page: '6p', dataI: '06' },
  { num: '05', title: '서비스 구조', page: '7p', dataI: '07' },
  { num: '06', title: '핵심 기능 시연', page: '8p', dataI: '08' },
  { num: '07', title: '차별점 & 기술 스택', page: '9p', dataI: '09' },
  { num: '08', title: '기대효과 및 활용방안', page: '10p', dataI: '10' },
  { num: '09', title: '팀 소개', page: '11p', dataI: '11' },
]

export default function S2Toc({ active }) {
  return (
    <Slide id="s2" active={active}>
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">00</span>
          <div className="header-title">목차</div>
        </div>
        <div className="toc-grid">
          {items.map(item => (
            <div className="toc-item" data-i={item.dataI} key={item.dataI}>
              <span className="item-num">{item.num}</span>
              <span className="item-title">{item.title}</span>
              <span className="item-gap" />
              <span className="item-dash" />
              <span className="item-page">{item.page}</span>
            </div>
          ))}
        </div>
        <Footer />
      </div>
    </Slide>
  )
}
