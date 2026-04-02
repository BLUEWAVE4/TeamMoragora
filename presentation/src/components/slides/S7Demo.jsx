import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide7.css'

const demoSteps = [
  { num: '01', title: '회원가입 · 로그인', desc: '카카오 / 구글 OAuth' },
  { num: '02', title: '토론 생성', desc: '주제 → 목적 · 렌즈 → 카테고리' },
  { num: '03', title: '주장 작성', desc: '입론 (R1) → 반론 (R2)' },
  { num: '04', title: 'AI 3사 판결', desc: 'GPT · Gemini · Claude 동시 판결' },
  { num: '05', title: '시민 투표', desc: 'A / B 투표 → 하이브리드 판결' },
  { num: '06', title: '판결문 확인', desc: '5항목 점수 · AI별 분석' },
]

export default function S7Demo({ active }) {
  return (
    <Slide id="s7" active={active}>
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">05</span>
          <span className="header-title">핵심 기능 시연</span>
        </div>

        <div className="s7-body">
          {/* 모바일 폰 SVG */}
          <div className="s7-phone">
            <svg viewBox="0 0 280 560" fill="none" xmlns="http://www.w3.org/2000/svg" className="s7-phone-svg">
              <rect x="2" y="2" width="276" height="556" rx="36" ry="36"
                stroke="rgba(201,168,76,0.4)" strokeWidth="3" fill="rgba(10,10,8,0.6)" />
              <rect x="95" y="12" width="90" height="6" rx="3"
                fill="rgba(201,168,76,0.25)" />
              <rect x="12" y="28" width="256" height="504" rx="8"
                fill="rgba(26,26,24,0.95)" />
              <rect x="277" y="100" width="3" height="40" rx="1.5" fill="rgba(201,168,76,0.3)" />
              <rect x="277" y="160" width="3" height="60" rx="1.5" fill="rgba(201,168,76,0.3)" />
              <rect x="105" y="542" width="70" height="4" rx="2"
                fill="rgba(201,168,76,0.2)" />
            </svg>

            <div className="s7-screen">
              <div className="s7-screen-header">
                <span className="s7-screen-logo">MORAGORA</span>
              </div>
              <div className="s7-screen-body">
                <p className="s7-screen-text">모라고라 서비스를<br/>직접 체험해 보세요</p>
                <a
                  href="https://team-moragora-client.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="s7-demo-btn"
                >
                  라이브 데모 바로가기
                  <span className="s7-arrow">&#8599;</span>
                </a>
              </div>
            </div>
          </div>

          {/* 시연 순서 카드 */}
          <div className="s7-steps-card">
            <div className="s7-steps-title">시연 순서</div>
            <div className="s7-steps-list">
              {demoSteps.map((step, i) => (
                <div className="s7-step" key={i} style={{ animationDelay: `${0.8 + i * 0.12}s` }}>
                  <span className="s7-step-num">{step.num}</span>
                  <div className="s7-step-info">
                    <span className="s7-step-title">{step.title}</span>
                    <span className="s7-step-desc">{step.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </Slide>
  )
}
