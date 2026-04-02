import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide3b.css'

const asIs = [
  '논쟁이 결론 없이 감정적 대립으로 확대',
  '제3자 중재 없이 관계 피로도 증가',
  '다수결 투표 — 감정·편향에 취약',
  '댓글 기반 판단 — 구조적 한계',
  '객관적 판결 서비스 부재',
]

const toBe = [
  'AI 3사가 독립 분석 → 논리적 판결문 제공',
  '명확한 근거로 양측이 결과 수긍',
  '게이미피케이션으로 건전한 논증 문화',
  '랭킹 시스템으로 논리력 가시화',
  '판결문 공개 → 논증 사례 학습',
]

const core = '객관적이고 논리적인 결론을 내려줄 신뢰할 수 있는 제3자(중재자)가 부재하여, 논쟁이 감정적 대립으로 확대되거나 결론 없이 지속되는 문제'

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
