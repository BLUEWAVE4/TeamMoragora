import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide3b.css'

const asIs = [
  '결론 없는 감정 대립',
  '중재자 부재',
  '다수결 편향',
  '댓글 판단의 한계',
  '판결 서비스 부재',
]

const toBe = [
  'AI 3사 독립 판결',
  '근거 기반 수긍',
  '게이미피케이션',
  '랭킹 시스템',
  '판결문 공개 학습',
]

const core = '논쟁의 객관적 중재자가 없어 감정 대립으로 확대되는 문제'

export default function S3bProblem({ active, stepIndex = 0 }) {
  return (
    <Slide id="s3b" active={active}>
      <div className="s3b-wrap">
        <div className="header">
          <span className="page-num">02</span>
          <span className="header-title">문제 정의</span>
        </div>

        <div className="s3b-body">
          {/* As-Is */}
          <div className={`s3b-col${stepIndex >= 0 ? ' lit' : ''}`}>
            <div className="s3b-col-label as-is">As-Is · 현재 상태</div>
            <div className="s3b-card-list">
              {asIs.map((item, i) => (
                <div className="s3b-card as-is" key={i}>
                  <span className="s3b-card-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="s3b-card-text">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 화살표 */}
          <div className={`s3b-arrow${stepIndex >= 1 ? ' lit' : ''}`}>→</div>

          {/* To-Be */}
          <div className={`s3b-col${stepIndex >= 1 ? ' lit' : ''}`}>
            <div className="s3b-col-label to-be">To-Be · 목표 상태</div>
            <div className="s3b-card-list">
              {toBe.map((item, i) => (
                <div className="s3b-card to-be" key={i}>
                  <span className="s3b-card-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="s3b-card-text">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 핵심 문제 */}
        <div className={`s3b-core${stepIndex >= 2 ? ' lit' : ''}`}>
          <div className="s3b-core-label">Core Problem</div>
          <div className="s3b-core-text">{core}</div>
        </div>

        <Footer delay={2} />
      </div>
    </Slide>
  )
}

S3bProblem.stepCount = 2
