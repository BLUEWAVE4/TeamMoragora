import { useState, useEffect, useRef } from 'react'
import Slide from '../Slide'
import '../../styles/slide6.css'

import img01 from '../../assets/images/5-01.webp'
import img02 from '../../assets/images/5-02.webp'
import img03 from '../../assets/images/5-03.webp'
import img04 from '../../assets/images/5-04.webp'
import img05 from '../../assets/images/5-05.webp'
import img06 from '../../assets/images/5-06.webp'
import img07 from '../../assets/images/5-07.webp'
import img08 from '../../assets/images/5-08.webp'
import img09 from '../../assets/images/5-09.webp'
import img10 from '../../assets/images/5-10.webp'

const SCREENSHOTS = [img01, img02, img03, img04, img05, img06, img07, img08, img09, img10]

const MODES = [
  {
    name: 'Solo', sub: 'AI 소크라테스와 연습',
    flow: [
      { name: '주제 입력', desc: '토론 주제 직접 작성' },
      { name: '입장 선택', desc: '찬성/반대 선택' },
      { name: '주장 작성', desc: '나의 논증 작성' },
      { name: 'AI 코칭', desc: '소크라테스 피드백' },
      { name: 'AI 반박 생성', desc: 'AI가 반론 제시' },
      { name: '반론 작성', desc: '재반박 논증' },
      { name: '루브릭 채점', desc: '5개 기준 점수' },
    ],
  },
  {
    name: 'Duo', sub: '1:1 실시간 토론',
    flow: [
      { name: '논쟁 생성', desc: '주제 · 카테고리 설정' },
      { name: '초대코드 공유', desc: '상대방 초대' },
      { name: '상대 입장', desc: '찬반 매칭' },
      { name: '1R 주장', desc: '입론 작성' },
      { name: '2R 반박', desc: '반론 작성' },
      { name: 'AI 3사 판결', desc: 'GPT·Gemini·Claude' },
      { name: '시민 투표', desc: '커뮤니티 참여' },
      { name: '최종 판결', desc: 'AI 75% + 시민 25%' },
    ],
  },
  {
    name: 'Chat', sub: '실시간 채팅 토론',
    flow: [
      { name: '방 생성', desc: '토론방 개설' },
      { name: '참가자 입장', desc: '실시간 참여' },
      { name: '실시간 채팅', desc: '자유 토론' },
      { name: '관전자 투표', desc: '실시간 여론' },
      { name: '종료 트리거', desc: '토론 마감' },
      { name: 'AI 판결', desc: 'AI 채점' },
      { name: '결과 공개', desc: '승패 · XP 반영' },
    ],
  },
]

/* step0: 아키텍처  step1~3: 토론 모드 + 사용자 여정 */
export default function S6Structure({ active, stepIndex = 0 }) {
  const [slideIdx, setSlideIdx] = useState(0)
  const timerRef = useRef(null)
  const stepRef = useRef(stepIndex)
  stepRef.current = stepIndex

  // 슬라이드 진입 시 타이머 시작, 스텝 변경에 리셋하지 않음
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (active) {
      setSlideIdx(0)
      timerRef.current = setInterval(() => {
        if (stepRef.current >= 1 && stepRef.current <= 3) {
          setSlideIdx(prev => (prev + 1) % SCREENSHOTS.length)
        }
      }, 3000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [active])

  return (
    <Slide id="s6" active={active}>
      <div className="s-wrap s6-wrap">
        <div className="header">
          <span className="page-num">05</span>
          <span className="header-title">{stepIndex === 0 ? '서비스 구조 (시스템 아키텍처)' : '서비스 구조'}</span>
        </div>

        {/* ── step 0: 아키텍처 (이미지 재현) ── */}
        {stepIndex === 0 && (
          <div className="s6-body">
            <div className="s6-arch">

              {/* Client 열: 클라이언트 + 범례 */}
              <div className="s6-client-col">
                <div className="s6-group client">
                  <div className="s6-group-title">Client · React + Vite</div>
                  <div className="s6-inner-rows">
                    <div className="s6-irow-v s6-no-arrow"><span className="s6-tag blue">Pages</span><span className="s6-files">home | chat | debate | ranking | profile</span></div>
                    <div className="s6-pages-conn">
                      <svg width="24" height="100%" viewBox="0 0 24 16">
                        <line x1="12" y1="0" x2="12" y2="16" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" />
                        <polyline points="8,13 12,16 16,13" fill="none" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div className="s6-irow-v"><span className="s6-tag blue">Components</span><span className="s6-files">common | debate | layout | verdict</span></div>
                    {/* Components → Store(양방향) / Services(단방향) 커넥터 */}
                    <div className="s6-pair-conn">
                      <svg className="s6-pair-conn-left" width="24" height="100%" viewBox="0 0 24 16">
                        <polyline points="8,3 12,0 16,3" fill="none" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" />
                        <line x1="12" y1="0" x2="12" y2="16" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" />
                        <polyline points="8,13 12,16 16,13" fill="none" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" />
                      </svg>
                      <svg className="s6-pair-conn-right" width="24" height="100%" viewBox="0 0 24 16">
                        <line x1="12" y1="0" x2="12" y2="16" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" />
                        <polyline points="8,13 12,16 16,13" fill="none" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div className="s6-irow-pair">
                      <div className="s6-irow-v half"><span className="s6-tag purple">Store</span><span className="s6-files">Zustand | Context</span></div>
                      <div className="s6-irow-v half"><span className="s6-tag blue">Services</span><span className="s6-files">api | socket</span></div>
                    </div>
                    {/* Components → Hooks·Utils 하향 커넥터 (점선 + 하단 헤드) */}
                    <div className="s6-hooks-conn">
                      <svg width="24" height="100%" viewBox="0 0 24 16" overflow="visible">
                        <line x1="12" y1="-100" x2="12" y2="16" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" strokeDasharray="1.5 2.5" />
                        <polyline points="8,13 12,16 16,13" fill="none" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div className="s6-irow-v"><span className="s6-tag purple">Hooks · Utils</span><span className="s6-files">useCountdown | useModalState | avatar | dateFormatter</span></div>
                  </div>
                </div>
                {/* 범례 카드 */}
                <div className="s6-legend-card">
                  <div className="s6-legend-item"><div className="s6-legend-line solid" /><span>요청 / 응답 (HTTP · API)</span></div>
                  <div className="s6-legend-item"><div className="s6-legend-line dotted" /><span>의존성 / 참조 (import)</span></div>
                  <div className="s6-legend-item"><div className="s6-legend-line long-dash" /><span>실시간 연결 (WebSocket)</span></div>
                </div>
              </div>

              {/* Client Socket ↔ Server Socket + Client Services ↔ Supabase 엘보 커넥터 */}
              <div className="s6-conn-socket">
                <svg width="100%" height="100%" viewBox="0 0 20 100" preserveAspectRatio="none">
                  {/* Services ↔ Middleware 양방향 (금색) */}
                  <path d="M 0 24 H 9 V 10 H 20" fill="none" stroke="rgba(26,53,96,0.35)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  <polyline points="3,23 0,24 3,25" fill="none" stroke="rgba(26,53,96,0.35)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  <polyline points="17,9 20,10 17,11" fill="none" stroke="rgba(26,53,96,0.35)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  {/* Socket 양방향 (하늘색, 긴 점선) */}
                  <path d="M 0 37 H 12 V 50 H 20" fill="none" stroke="rgba(100,200,240,0.35)" strokeWidth="1.5" strokeDasharray="6 3" vectorEffect="non-scaling-stroke" />
                  <polyline points="3,36 0,37 3,38" fill="none" stroke="rgba(100,200,240,0.35)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  <polyline points="17,49 20,50 17,51" fill="none" stroke="rgba(100,200,240,0.35)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  {/* Supabase 양방향 (초록색) */}
                  <path d="M 0 53 H 10 V 68 H 20" fill="none" stroke="rgba(100,200,140,0.35)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  <polyline points="3,52 0,53 3,54" fill="none" stroke="rgba(100,200,140,0.35)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  <polyline points="17,67 20,68 17,69" fill="none" stroke="rgba(100,200,140,0.35)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>

              {/* Server 열: 서버 + 하단 인프라 */}
              <div className="s6-server-col">
                <div className="s6-group server">
                  <div className="s6-group-title">Server · Express + Node</div>
                  <div className="s6-inner-rows">
                    <div className="s6-irow-v s6-no-arrow"><span className="s6-tag blue">Middleware</span><span className="s6-files">requireAuth | Filter | validate</span></div>
                    <div className="s6-svg-conn"><svg width="24" height="100%" viewBox="0 0 24 16"><line x1="12" y1="0" x2="12" y2="16" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" /><polyline points="8,13 12,16 16,13" fill="none" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" /></svg></div>
                    <div className="s6-irow-v s6-no-arrow"><span className="s6-tag blue">Routes</span><span className="s6-files">auth | debate | argument | vote | profile</span></div>
                    <div className="s6-svg-conn"><svg width="24" height="100%" viewBox="0 0 24 16"><line x1="12" y1="0" x2="12" y2="16" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" /><polyline points="8,13 12,16 16,13" fill="none" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" /></svg></div>
                    <div className="s6-irow-v s6-no-arrow"><span className="s6-tag blue">Controllers</span><span className="s6-files">auth | debate | judgment | vote | chat</span></div>
                    {/* Controllers → Services·AI(단방향) / Socket.io(양방향) 분기 */}
                    <div className="s6-pair-conn">
                      <svg className="s6-pair-conn-left" width="24" height="100%" viewBox="0 0 24 16">
                        <line x1="12" y1="0" x2="12" y2="16" stroke="rgba(100,200,240,0.5)" strokeWidth="1.2" />
                        <polyline points="8,3 12,0 16,3" fill="none" stroke="rgba(100,200,240,0.5)" strokeWidth="1.2" />
                        <polyline points="8,13 12,16 16,13" fill="none" stroke="rgba(100,200,240,0.5)" strokeWidth="1.2" />
                      </svg>
                      <svg className="s6-pair-conn-right" width="24" height="100%" viewBox="0 0 24 16">
                        <line x1="12" y1="0" x2="12" y2="16" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" />
                        <polyline points="8,13 12,16 16,13" fill="none" stroke="rgba(26,53,96,0.5)" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div className="s6-irow-pair">
                      <div className="s6-irow-v half"><span className="s6-tag sky">Socket.io</span><span className="s6-files">real-time chat / lobby</span></div>
                      <div className="s6-irow-v half"><span className="s6-tag blue">Services · AI</span><span className="s6-files">claude | gemini | openai | verdict | xp</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* → API 엘보 커넥터 */}
              <div className="s6-conn-api">
                <svg width="100%" height="100%" viewBox="0 0 20 100" preserveAspectRatio="none">
                  <path d="M 0 39 H 10 V 15 H 20" fill="none" stroke="rgba(26,53,96,0.35)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  <polyline points="17,14 20,15 17,16" fill="none" stroke="rgba(26,53,96,0.35)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>

              {/* API 영역 */}
              <div className="s6-right-col">
                <div className="s6-api-col">
                  <div className="s6-api-head">API</div>
                  <div className="s6-api-stack">
                    <div className="s6-api gpt">GPT-4o</div>
                    <div className="s6-api gemini">Gemini 2.5 Flash</div>
                    <div className="s6-api claude">Claude Sonnet 4</div>
                    <div className="s6-api grok">Grok 3 Mini <span className="s6-fb">fallback</span></div>
                  </div>
                </div>
                {/* 인프라 (별도 카드) */}
                <div className="s6-infra">
                  <div className="s6-infra-box">
                    <div className="s6-infra-title">Supabase</div>
                    <div className="s6-infra-desc">Auth (OAuth · Kakao · Google) | PostgreSQL DB</div>
                  </div>
                  <div className="s6-infra-box">
                    <div className="s6-infra-title">GitHub Actions</div>
                    <div className="s6-infra-desc">daily-debate cron</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── step 1~3: 토론 모드 + 모드별 사용자 여정 ── */}
        {stepIndex >= 1 && stepIndex <= 3 && (
          <div className="s6-body">
            <div className="s6-section-tag">토론 모드 · 사용자 여정</div>

            <div className="s6-mode-split">
              {/* 좌측: 모바일 프레임 (이미지용) */}
              <div className="s6-mode-left">
                <div className="s6-phone">
                  <svg viewBox="0 0 280 560" fill="none" className="s6-phone-svg">
                    <rect x="2" y="2" width="276" height="556" rx="36" ry="36"
                      stroke="rgba(26,53,96,0.4)" strokeWidth="3" fill="rgba(10,10,8,0.6)" />
                    <rect x="95" y="12" width="90" height="6" rx="3" fill="rgba(26,53,96,0.25)" />
                    <rect x="12" y="28" width="256" height="504" rx="8" fill="rgba(26,26,24,0.95)" />
                    <rect x="105" y="542" width="70" height="4" rx="2" fill="rgba(26,53,96,0.2)" />
                  </svg>
                  <div className="s6-phone-screen">
                    {SCREENSHOTS.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`screen-${i + 1}`}
                        className={`s6-slide-img${i === slideIdx ? ' active' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 우측: 모드 탭 + 사용자 여정 카드 리스트 */}
              <div className="s6-mode-right">
                {/* 3가지 모드 1줄 배치 */}
                <div className="s6-mode-tabs">
                  {MODES.map((m, i) => (
                    <div className={`s6-mode-tab ${i === stepIndex - 1 ? 'active' : ''}`} key={i}>
                      <div className="s6-mode-tab-name">{m.name}</div>
                      <div className="s6-mode-tab-sub">{m.sub}</div>
                    </div>
                  ))}
                </div>

                {/* 사용자 여정 카드 리스트 */}
                <div className="s6-flow-list">
                  {MODES[stepIndex - 1].flow.map((s, i) => (
                    <div className="s6-flow-item" key={i}>
                      <div className="s6-flow-num">{String(i + 1).padStart(2, '0')}</div>
                      <div className="s6-flow-body">
                        <span className="s6-flow-name">{s.name}</span>
                        <span className="s6-flow-sep">—</span>
                        <span className="s6-flow-desc">{s.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Slide>
  )
}

S6Structure.stepCount = 3
