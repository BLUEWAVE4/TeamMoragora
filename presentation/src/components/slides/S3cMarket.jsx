import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide3c.css'

const features = [
  'AI 논리 판결',
  '다중 AI 교차검증',
  '구조화된 논쟁',
  '게이미피케이션',
  '시민 투표 결합',
  '콘텐츠 필터링',
]

const services = [
  { name: '모라고라',    marks: ['O','O','O','O','O','O'], highlight: true },
  { name: '네이버 지식iN', marks: ['X','X','X','X','X','X'] },
  { name: '커뮤니티 투표', marks: ['X','X','X','X','O','X'] },
  { name: '밸런스 게임',  marks: ['X','X','X','X','X','X'] },
  { name: 'ChatGPT',     marks: ['O','X','X','X','X','O'] },
  { name: 'Kialo',       marks: ['X','X','O','X','X','X'] },
]

export default function S3cMarket({ active }) {
  return (
    <Slide id="s3c" active={active}>
      <div className="s3c-wrap">
        <div className="header">
          <span className="page-num">03</span>
          <span className="header-title">시장 분석</span>
        </div>

        <div className="s3c-body">
          {/* 헤더 행 */}
          <div className="s3c-grid head">
            <div className="s3c-cell corner" />
            {features.map((f, i) => (
              <div className="s3c-cell feat" key={i}>{f}</div>
            ))}
          </div>

          {/* 데이터 행 */}
          {services.map((s, i) => (
            <div
              className={`s3c-grid row${s.highlight ? ' hl' : ''}`}
              key={i}
              style={{ animationDelay: `${0.5 + i * 0.12}s` }}
            >
              <div className="s3c-cell name">{s.name}</div>
              {s.marks.map((m, j) => (
                <div className={`s3c-cell mark ${m === 'O' ? 'yes' : 'no'}`} key={j}>{m}</div>
              ))}
            </div>
          ))}
        </div>

        <Footer delay={2} />
      </div>
    </Slide>
  )
}
