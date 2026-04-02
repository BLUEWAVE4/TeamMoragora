import { useState, useEffect } from 'react'
import Slide from '../Slide'
import '../../styles/slide8b.css'

const cases = [
  {
    id: 'zustand',
    tag: 'CASE 1',
    title: '불필요한 리렌더링',
    problem: {
      label: '문제',
      desc: 'Context API로 전역 상태 관리 시 값 하나 변경에 트리 전체 리렌더',
    },
    steps: [
      {
        num: '01',
        name: 'Context → Zustand 전환',
        desc: 'selector 패턴으로 필요한 값만 구독',
        code: 'useThemeStore(s => s.isDark)',
      },
      {
        num: '02',
        name: 'React.memo + lazy',
        desc: 'DebateCard memo 처리,\n18개 페이지 코드 스플리팅',
      },
      {
        num: '03',
        name: 'throttle / debounce',
        desc: '스크롤·검색 고빈도 이벤트 호출 억제',
      },
    ],
    result: {
      metrics: [
        { value: '80', suffix: '%↓', label: '리렌더 범위' },
        { value: '3', suffix: '개', label: 'Store 분리' },
        { value: '18', suffix: 'p', label: 'lazy 적용' },
      ],
    },
  },
  {
    id: 'cache',
    tag: 'CASE 2',
    title: '페이지 로딩 지연',
    problem: {
      label: '문제',
      desc: '매 진입마다 API 호출 대기 + 카드별 개별 API (N+1 문제)',
    },
    steps: [
      {
        num: '01',
        name: 'Stale-While-Revalidate',
        desc: 'sessionStorage 캐시 즉시 표시\n→ 백그라운드 갱신',
      },
      {
        num: '02',
        name: '배치 API 도입',
        desc: '투표·좋아요 상태를\n1회 배치 호출로 통합',
        code: 'getMyVotesBatch(ids)',
      },
      {
        num: '03',
        name: '병렬화 + 비동기 폰트',
        desc: 'Promise.all 병렬 호출,\n폰트 렌더 블로킹 제거',
      },
    ],
    result: {
      metrics: [
        { value: '0', suffix: 'ms', label: '캐시 히트 시' },
        { value: '90', suffix: '%↓', label: 'API 호출 수' },
        { value: '50', suffix: '%↓', label: '인증 초기화' },
      ],
    },
  },
]

export default function S8bTrouble({ active, stepIndex = 0 }) {
  // step0: 좌측 CASE1 표시
  // step1: CASE1 스텝 순차 점등
  // step2: CASE1 결과 표시
  // step3: 우측 CASE2 표시
  // step4: CASE2 스텝 순차 점등
  // step5: CASE2 결과 표시

  const [litSteps1, setLitSteps1] = useState(0)
  const [litSteps2, setLitSteps2] = useState(0)

  // CASE1 스텝 순차 점등
  useEffect(() => {
    if (stepIndex === 1 && active) {
      setLitSteps1(0)
      let count = 0
      const timer = setInterval(() => {
        count++
        setLitSteps1(count)
        if (count >= 3) clearInterval(timer)
      }, 500)
      return () => clearInterval(timer)
    }
    if (stepIndex < 1) setLitSteps1(0)
    if (stepIndex >= 2) setLitSteps1(3)
  }, [stepIndex, active])

  // CASE2 스텝 순차 점등
  useEffect(() => {
    if (stepIndex === 4 && active) {
      setLitSteps2(0)
      let count = 0
      const timer = setInterval(() => {
        count++
        setLitSteps2(count)
        if (count >= 3) clearInterval(timer)
      }, 500)
      return () => clearInterval(timer)
    }
    if (stepIndex < 4) setLitSteps2(0)
    if (stepIndex >= 5) setLitSteps2(3)
  }, [stepIndex, active])

  const c1Visible = stepIndex >= 0
  const c1StepsVisible = stepIndex >= 1
  const c1ResultVisible = stepIndex >= 2
  const c2Visible = stepIndex >= 3
  const c2StepsVisible = stepIndex >= 4
  const c2ResultVisible = stepIndex >= 5

  return (
    <Slide id="s8b" active={active}>
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">08</span>
          <span className="header-title">트러블 슈팅</span>
        </div>

        <div className="s8b-body">
          {/* ── CASE 1 ── */}
          <div className={`s8b-case${c1Visible ? ' visible' : ''}`}>
            <div className="s8b-case-tag">{cases[0].tag}</div>
            <div className="s8b-case-title">{cases[0].title}</div>

            {/* 문제 */}
            <div className="s8b-problem">
              <span className="s8b-problem-label">{cases[0].problem.label}</span>
              <span className="s8b-problem-desc">{cases[0].problem.desc}</span>
            </div>

            {/* 해결 스텝 */}
            <div className={`s8b-steps${c1StepsVisible ? ' visible' : ''}`}>
              {cases[0].steps.map((step, i) => (
                <div className={`s8b-step${i < litSteps1 ? ' lit' : ''}`} key={i}>
                  <div className="s8b-step-num">{step.num}</div>
                  <div className="s8b-step-title">
                    <div className="s8b-step-name">{step.name}</div>
                  </div>
                  <div className="s8b-step-divider" />
                  <div className="s8b-step-body">
                    <div className="s8b-step-desc">{step.desc}</div>
                    {step.code && <div className="s8b-code">{step.code}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* 결과 */}
            <div className={`s8b-result${c1ResultVisible ? ' visible' : ''}`}>
              <div className="s8b-result-label">결과</div>
              <div className="s8b-metrics">
                {cases[0].result.metrics.map((m, i) => (
                  <div className="s8b-metric" key={i}>
                    <div className="s8b-metric-top">
                      <span className="s8b-metric-value">{m.value}</span>
                      <span className="s8b-metric-suffix">{m.suffix}</span>
                    </div>
                    <span className="s8b-metric-label">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── CASE 2 ── */}
          <div className={`s8b-case${c2Visible ? ' visible' : ''}`}>
            <div className="s8b-case-tag">{cases[1].tag}</div>
            <div className="s8b-case-title">{cases[1].title}</div>

            {/* 문제 */}
            <div className="s8b-problem">
              <span className="s8b-problem-label">{cases[1].problem.label}</span>
              <span className="s8b-problem-desc">{cases[1].problem.desc}</span>
            </div>

            {/* 해결 스텝 */}
            <div className={`s8b-steps${c2StepsVisible ? ' visible' : ''}`}>
              {cases[1].steps.map((step, i) => (
                <div className={`s8b-step${i < litSteps2 ? ' lit' : ''}`} key={i}>
                  <div className="s8b-step-num">{step.num}</div>
                  <div className="s8b-step-title">
                    <div className="s8b-step-name">{step.name}</div>
                  </div>
                  <div className="s8b-step-divider" />
                  <div className="s8b-step-body">
                    <div className="s8b-step-desc">{step.desc}</div>
                    {step.code && <div className="s8b-code">{step.code}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* 결과 */}
            <div className={`s8b-result${c2ResultVisible ? ' visible' : ''}`}>
              <div className="s8b-result-label">결과</div>
              <div className="s8b-metrics">
                {cases[1].result.metrics.map((m, i) => (
                  <div className="s8b-metric" key={i}>
                    <div className="s8b-metric-top">
                      <span className="s8b-metric-value">{m.value}</span>
                      <span className="s8b-metric-suffix">{m.suffix}</span>
                    </div>
                    <span className="s8b-metric-label">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </Slide>
  )
}

S8bTrouble.stepCount = 5
