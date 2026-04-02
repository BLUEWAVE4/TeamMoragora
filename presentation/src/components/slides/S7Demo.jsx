import { useEffect, useRef } from 'react'
import Slide from '../Slide'
import { navGuard } from '../../hooks/useNavigator'
import '../../styles/slide7.css'

const demoGroups = [
  {
    tag: '시연 순서 1',
    title: '1vs1 논쟁',
    steps: [
      { num: '01', title: '토론 생성', desc: '논쟁 3단계 위자드' },
      { num: '02', title: '주장 작성', desc: '입론 (R1) → 반론 (R2)' },
      { num: '03', title: 'AI 3사 판결', desc: 'GPT · Gemini · Claude' },
      { num: '04', title: '시민 투표', desc: 'A / B 투표 → 복합 판결' },
      { num: '05', title: '판결문 확인', desc: '5항목 점수 · AI별 분석' },
    ],
  },
  {
    tag: '시연 순서 2',
    title: '실시간 논쟁',
    steps: [
      { num: '01', title: '논쟁방 생성', desc: '주제 · 카테고리 설정' },
      { num: '02', title: '참가자 입장', desc: '초대코드 · 실시간 참여' },
      { num: '03', title: '실시간 채팅', desc: '자유 토론 진행' },
      { num: '04', title: '관전자 투표', desc: '실시간 여론 반영' },
      { num: '05', title: 'AI 판결 · 결과', desc: '승패 · XP 반영' },
    ],
  },
  {
    tag: '시연 순서 3',
    title: '부가 기능',
    steps: [
      { num: '01', title: '회원가입 · 로그인', desc: '카카오 / 구글 OAuth' },
      { num: '02', title: '아바타 시스템', desc: 'DiceBear 프로필' },
      { num: '03', title: '랭킹 · 전적', desc: 'XP 기반 순위' },
      { num: '04', title: '홈 피드', desc: '논쟁 탐색 · 페이지네이션' },
      { num: '05', title: '마이페이지', desc: '전적 통계 · 프로필' },
    ],
  },
]
export default function S7Demo({ active, stepIndex = 0 }) {
  const particlesRef = useRef(null)

  useEffect(() => {
    const c = particlesRef.current
    if (!c) return
    if (!active) { c.innerHTML = ''; return }
    c.innerHTML = ''
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div')
      p.className = 's7-splash-particle'
      const x = Math.random() * 100
      const dur = 5 + Math.random() * 8
      const delay = Math.random() * 4
      const drift = (Math.random() - 0.5) * 30
      const size = 1 + Math.random() * 1.5
      p.style.cssText = `left:${x}%;bottom:${Math.random() * 10}%;--drift:${drift}px;animation-duration:${dur}s;animation-delay:${delay}s;width:${size}px;height:${size}px;`
      c.appendChild(p)
    }
    return () => { c.innerHTML = '' }
  }, [active])

  // stepIndex에 따라 그룹별 한번에 점등
  const litGroup = stepIndex // 0: 그룹1, 1: 그룹2, 2: 그룹3

  return (
    <Slide id="s7" active={active}>
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">06</span>
          <span className="header-title">핵심 기능 시연</span>
        </div>

        <div className="s7-body">
          {/* 모바일 폰 SVG */}
          <div className="s7-phone-col">
          <div className="s7-phone">
            <svg viewBox="0 0 280 560" fill="none" xmlns="http://www.w3.org/2000/svg" className="s7-phone-svg">
              <rect x="2" y="2" width="276" height="556" rx="36" ry="36"
                stroke="rgba(26,53,96,0.4)" strokeWidth="3" fill="rgba(10,10,8,0.6)" />
              <rect x="95" y="12" width="90" height="6" rx="3"
                fill="rgba(26,53,96,0.25)" />
              <rect x="12" y="28" width="256" height="504" rx="8"
                fill="rgba(26,26,24,0.95)" />
              <rect x="277" y="100" width="3" height="40" rx="1.5" fill="rgba(26,53,96,0.3)" />
              <rect x="277" y="160" width="3" height="60" rx="1.5" fill="rgba(26,53,96,0.3)" />
              <rect x="105" y="542" width="70" height="4" rx="2"
                fill="rgba(26,53,96,0.2)" />
            </svg>

            <div className="s7-screen">
              {/* 스플래시 배경 */}
              <div className="s7-splash-bg" />
              <div className="s7-splash-vignette" />
              <div className="s7-splash-cols">
                <div className="s7-splash-col" />
                <div className="s7-splash-col" />
                <div className="s7-splash-col" />
                <div className="s7-splash-col" />
              </div>
              <div className="s7-splash-particles" ref={particlesRef} />

              {/* 스플래시 콘텐츠 */}
              <div className="s7-splash-content">
                <div className="s7-splash-divider">
                  <div className="s7-splash-div-line" />
                  <div className="s7-splash-diamond" />
                  <div className="s7-splash-div-line right" />
                </div>
                <div className="s7-splash-title">모라고라<span className="s7-splash-dot">.</span></div>
                <div className="s7-splash-sub">AI 복합 판결 서비스</div>
                <div className="s7-splash-divider bottom">
                  <div className="s7-splash-div-line" />
                  <span className="s7-splash-omega">Ω</span>
                  <div className="s7-splash-div-line right" />
                </div>
              </div>

              {/* 데모 버튼 */}
              <div
                className="s7-demo-btn"
                onPointerDown={() => { navGuard.skip = true }}
                onClick={() => window.open('https://team-moragora-client.vercel.app/', '_blank')}
              >
                라이브 데모 바로가기
                <span className="s7-arrow">&#8599;</span>
              </div>
            </div>
          </div>
          </div>

          {/* 시연 순서 */}
          <div className="s7-steps-area">
            {demoGroups.map((group, gi) => (
              <div className={`s7-group s7-group-${gi}${gi === litGroup ? ' lit' : gi < litGroup ? ' passed' : ''}`} key={gi}>
                <div className="s7-group-header">
                  <span className="s7-group-tag">{group.tag}</span>
                  <span className="s7-group-title">{group.title}</span>
                </div>
                <div className="s7-steps-grid">
                  {group.steps.map((step, i) => (
                    <div className={`s7-step-card${gi === litGroup ? ' lit' : ''}`} key={i}>
                      <span className="s7-step-num">{step.num}</span>
                      <span className="s7-step-title">{step.title}</span>
                      <span className="s7-step-desc">{step.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Slide>
  )
}

S7Demo.stepCount = 2
