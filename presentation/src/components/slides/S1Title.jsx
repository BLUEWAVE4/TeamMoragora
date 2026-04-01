import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide1.css'

export default function S1Title({ active }) {
  return (
    <Slide id="s1" active={active}>
      <div className="s-content">
        <div className="pre-tag">
          <div className="pre-tag-line" />
          <span className="pre-tag-text">AI Debate Verdict Platform</span>
        </div>
        <h1 className="title">모라고라</h1>
        <div className="divider">
          <div className="divider-line" />
          <div className="divider-dot" />
        </div>
        <p className="subtitle">
          논쟁의 마침표를 위한<br />
          <strong>AI 복합 판결 서비스</strong>
        </p>
      </div>
      <div className="s1-team">
        <div className="team-label">Team</div>
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
