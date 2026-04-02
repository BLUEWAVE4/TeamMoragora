import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide1.css'

export default function S1Title({ active }) {
  return (
    <Slide id="s1" active={active}>
      <div className="s-content">
        <h1 className="title">모라고라<span className="title-dot">.</span></h1>
        <div className="divider">
          <div className="divider-line" />
          <div className="divider-dot" />
        </div>
        <p className="subtitle">
          <span className="subtitle-gold">논쟁의 마침표</span>를 위한<br />
          <strong>AI 복합 판결 서비스</strong>
        </p>
      </div>
      <div className="s1-team">
        <div className="team-names">
          <span className="team-name">김선관</span>
          <span className="team-name">서우주</span>
          <span className="team-name">김준민</span>
          <span className="team-name">채유진</span>
        </div>
      </div>
      <Footer />
    </Slide>
  )
}
