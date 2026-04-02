import { useState, useEffect } from 'react'
import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide7b.css'

const serverTechs = [
  {
    tag: 'AI',
    title: 'AI 3사 병렬 판결',
    points: [
      'GPT · Gemini · Claude Promise.all 동시 호출',
      '5항목 루브릭 채점 (논리·증거·설득·일관·표현)',
      '실패 시 Grok 자동 폴백 + 재시도',
    ],
  },
  {
    tag: '필터',
    title: '3단계 콘텐츠 필터',
    points: [
      'Stage 1 — 200+ 비속어 정규식 (초성·특수문자 우회 방어)',
      'Stage 2 — GPT 유해성 검증 (혐오·선동·개인정보)',
      'Stage 3 — AI 게이트키퍼 (주제 적합성)',
    ],
  },
  {
    tag: '실시간',
    title: 'Socket.IO 양방향 통신',
    points: [
      '채팅·로비·투표 실시간 동기화',
      '30초 재연결 유예 + 서버 복구 시 타이머 자동 복원',
      '15분 타이머 만료 → 판결 자동 트리거',
    ],
  },
]

const clientTechs = [
  {
    tag: '시각화',
    title: '판결 레이더 차트',
    points: [
      'Chart.js 5축 레이더 — AI별 토글 비교',
      '점수 구간 밴드 플러그인 (커스텀 배경)',
      '다크모드 자동 대응',
    ],
  },
  {
    tag: '인증',
    title: 'OAuth 소셜 로그인',
    points: [
      '카카오 · 구글 Supabase OAuth 2.0',
      '토큰 메모리 캐싱 + 401 자동 갱신 큐',
      '탭 복귀 시 세션 자동 체크',
    ],
  },
  {
    tag: 'UX',
    title: 'Framer Motion 인터랙션',
    points: [
      '채팅 메시지 스태거 애니메이션',
      '카운트다운 오버레이 (scale 전환)',
      '모달·토스트 exit 트랜지션',
    ],
  },
]

function S7bCoreTech({ active, stepIndex = 0 }) {
  const [litServer, setLitServer] = useState(0)
  const [litClient, setLitClient] = useState(0)

  // step0: 서버 카드 순차 점등
  useEffect(() => {
    if (stepIndex === 0 && active) {
      setLitServer(0)
      let count = 0
      const timer = setInterval(() => {
        count++
        setLitServer(count)
        if (count >= 3) clearInterval(timer)
      }, 400)
      return () => clearInterval(timer)
    }
    if (stepIndex >= 1) setLitServer(3)
    if (!active) { setLitServer(0); setLitClient(0) }
  }, [stepIndex, active])

  // step1: 클라이언트 카드 순차 점등
  useEffect(() => {
    if (stepIndex === 1 && active) {
      setLitClient(0)
      let count = 0
      const timer = setInterval(() => {
        count++
        setLitClient(count)
        if (count >= 3) clearInterval(timer)
      }, 400)
      return () => clearInterval(timer)
    }
    if (stepIndex < 1) setLitClient(0)
  }, [stepIndex, active])

  const serverVisible = stepIndex >= 0
  const clientVisible = stepIndex >= 1

  return (
    <Slide id="s7b" active={active}>
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">07</span>
          <span className="header-title">핵심 기술</span>
        </div>

        <div className="s7b-body">
          {/* ── 서버 사이드 ── */}
          <div className={`s7b-col${serverVisible ? ' visible' : ''}${clientVisible ? ' dim' : ''}`}>
            <div className="s7b-col-label">
              <span className="s7b-col-tag server">SERVER</span>
            </div>
            <div className="s7b-cards">
              {serverTechs.map((t, i) => (
                <div className={`s7b-card${i < litServer ? ' lit' : ''}`} key={i}>
                  <div className="s7b-card-head">
                    <span className="s7b-card-tag">{t.tag}</span>
                    <span className="s7b-card-title">{t.title}</span>
                  </div>
                  <ul className="s7b-card-points">
                    {t.points.map((p, j) => (
                      <li key={j}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* ── 클라이언트 사이드 ── */}
          <div className={`s7b-col${clientVisible ? ' visible' : ''}`}>
            <div className="s7b-col-label">
              <span className="s7b-col-tag client">CLIENT</span>
            </div>
            <div className="s7b-cards">
              {clientTechs.map((t, i) => (
                <div className={`s7b-card${i < litClient ? ' lit' : ''}`} key={i}>
                  <div className="s7b-card-head">
                    <span className="s7b-card-tag">{t.tag}</span>
                    <span className="s7b-card-title">{t.title}</span>
                  </div>
                  <ul className="s7b-card-points">
                    {t.points.map((p, j) => (
                      <li key={j}>{p}</li>
                    ))}
                  </ul>
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

S7bCoreTech.stepCount = 1

export default S7bCoreTech
