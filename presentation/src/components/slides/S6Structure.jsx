import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide6.css'

/* step0: 아키텍처  step1: 사용자 여정  step2: 토론 모드 */
export default function S6Structure({ active, stepIndex = 0 }) {
  return (
    <Slide id="s6" active={active}>
      <div className="s6-wrap">
        <div className="s6-header">
          <span className="page-num">04</span>
          <span className="header-title">서비스 구조</span>
        </div>

        {/* ── step 0: 아키텍처 (이미지 재현) ── */}
        {stepIndex === 0 && (
          <div className="s6-body">
            <div className="s6-section-tag">시스템 아키텍처</div>
            <div className="s6-arch">

              {/* 사용자 아이콘 */}
              <div className="s6-user">
                <div className="s6-user-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="s6-user-label">Users / Browser</div>
              </div>
              <div className="s6-conn-h">접속</div>

              {/* Client 열: 클라이언트 + 범례 */}
              <div className="s6-client-col">
                <div className="s6-group client">
                  <div className="s6-group-title">Client · React + Vite</div>
                  <div className="s6-inner-rows">
                    <div className="s6-irow-v"><span className="s6-tag blue">Pages</span><span className="s6-files">home | chat | debate | ranking | profile</span></div>
                    <div className="s6-irow-v"><span className="s6-tag blue">Components</span><span className="s6-files">common | debate | layout | verdict</span></div>
                    {/* Components → Store(양방향) / Services(단방향) 커넥터 */}
                    <div className="s6-pair-conn">
                      <svg className="s6-pair-conn-left" width="24" height="100%" viewBox="0 0 24 16">
                        <polyline points="8,3 12,0 16,3" fill="none" stroke="rgba(201,168,76,0.5)" strokeWidth="1.2" />
                        <line x1="12" y1="0" x2="12" y2="16" stroke="rgba(201,168,76,0.5)" strokeWidth="1.2" />
                        <polyline points="8,13 12,16 16,13" fill="none" stroke="rgba(201,168,76,0.5)" strokeWidth="1.2" />
                      </svg>
                      <svg className="s6-pair-conn-right" width="24" height="100%" viewBox="0 0 24 16">
                        <line x1="12" y1="0" x2="12" y2="16" stroke="rgba(201,168,76,0.5)" strokeWidth="1.2" />
                        <polyline points="8,13 12,16 16,13" fill="none" stroke="rgba(201,168,76,0.5)" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div className="s6-irow-pair">
                      <div className="s6-irow-v half"><span className="s6-tag purple">Store</span><span className="s6-files">Zustand | Context</span></div>
                      <div className="s6-irow-v half"><span className="s6-tag blue">Services</span><span className="s6-files">api | socket</span></div>
                    </div>
                    {/* Hooks·Utils → Components 상향 화살표 커넥터 */}
                    <div className="s6-hooks-conn">
                      <svg width="24" height="100%" viewBox="0 0 24 16">
                        <polyline points="8,3 12,0 16,3" fill="none" stroke="rgba(201,168,76,0.5)" strokeWidth="1.2" />
                        <line x1="12" y1="0" x2="12" y2="16" stroke="rgba(201,168,76,0.5)" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div className="s6-irow-v"><span className="s6-tag purple">Hooks · Utils</span><span className="s6-files">useCountdown | useModalState | avatar | dateFormatter</span></div>
                  </div>
                </div>
                {/* 범례 카드 */}
                <div className="s6-legend-card">
                  <div className="s6-legend-item"><div className="s6-legend-line solid" /><span>요청 / 호출</span></div>
                  <div className="s6-legend-item"><div className="s6-legend-line dashed" /><span>이벤트 / 트리거</span></div>
                </div>
              </div>

              {/* Server 열: 서버 + 하단 인프라 */}
              <div className="s6-server-col">
                <div className="s6-group server">
                  <div className="s6-group-title">Server · Express + Node</div>
                  <div className="s6-inner-rows">
                    <div className="s6-irow-v"><span className="s6-tag blue">Middleware</span><span className="s6-files">requireAuth | Filter | validate</span></div>
                    <div className="s6-irow-v"><span className="s6-tag blue">Routes</span><span className="s6-files">auth | debate | argument | vote | profile</span></div>
                    <div className="s6-irow-v"><span className="s6-tag blue">Controllers</span><span className="s6-files">auth | debate | judgment | vote | chat</span></div>
                    <div className="s6-irow-v"><span className="s6-tag blue">Services · AI</span><span className="s6-files">claude | gemini | openai | verdict | xp</span></div>
                    <div className="s6-irow-v"><span className="s6-tag sky">Socket.io</span><span className="s6-files">real-time chat / lobby</span></div>
                  </div>
                </div>
                {/* 서버 하단 인프라 */}
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

              {/* → API 엘보 커넥터 */}
              <div className="s6-conn-api">
                <svg width="100%" height="100%" viewBox="0 0 20 100" preserveAspectRatio="none">
                  <path d="M 0 39 H 10 V 15 H 20" fill="none" stroke="rgba(201,168,76,0.35)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  <polyline points="17,14 20,15 17,16" fill="none" stroke="rgba(201,168,76,0.35)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>

              {/* API 영역 */}
              <div className="s6-api-col">
                <div className="s6-api-head">API</div>
                <div className="s6-api-stack">
                  <div className="s6-api gpt">GPT-4o</div>
                  <div className="s6-api gemini">Gemini 2.5 Flash</div>
                  <div className="s6-api claude">Claude Sonnet 4</div>
                  <div className="s6-api grok">Grok 3 Mini <span className="s6-fb">fallback</span></div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── step 1~3: 토론 모드 + 모드별 사용자 여정 ── */}
        {stepIndex >= 1 && stepIndex <= 3 && (() => {
          const modes = [
            {
              name: 'Solo', sub: 'AI 소크라테스와 연습',
              flow: [
                { icon: '✏️', name: '주제 입력', desc: '토론 주제 직접 작성' },
                { icon: '🎯', name: '입장 선택', desc: '찬성/반대 선택' },
                { icon: '📝', name: '주장 작성', desc: '나의 논증 작성' },
                { icon: '🤖', name: 'AI 코칭', desc: '소크라테스 피드백' },
                { icon: '⚔️', name: 'AI 반박 생성', desc: 'AI가 반론 제시' },
                { icon: '🔄', name: '반론 작성', desc: '재반박 논증' },
                { icon: '📊', name: '루브릭 채점', desc: '5개 기준 점수' },
              ],
            },
            {
              name: 'Duo', sub: '1:1 실시간 토론',
              flow: [
                { icon: '✏️', name: '논쟁 생성', desc: '주제 · 카테고리 설정' },
                { icon: '🔗', name: '초대코드 공유', desc: '상대방 초대' },
                { icon: '👥', name: '상대 입장', desc: '찬반 매칭' },
                { icon: '📝', name: '1R 주장', desc: '입론 작성' },
                { icon: '⚔️', name: '2R 반박', desc: '반론 작성' },
                { icon: '🤖', name: 'AI 3사 판결', desc: 'GPT·Gemini·Claude' },
                { icon: '🗳️', name: '시민 투표', desc: '커뮤니티 참여' },
                { icon: '⚖️', name: '최종 판결', desc: 'AI 75% + 시민 25%' },
              ],
            },
            {
              name: 'Chat', sub: '실시간 채팅 토론',
              flow: [
                { icon: '🏠', name: '방 생성', desc: '토론방 개설' },
                { icon: '👥', name: '참가자 입장', desc: '실시간 참여' },
                { icon: '💬', name: '실시간 채팅', desc: '자유 토론' },
                { icon: '🗳️', name: '관전자 투표', desc: '실시간 여론' },
                { icon: '🔔', name: '종료 트리거', desc: '토론 마감' },
                { icon: '🤖', name: 'AI 판결', desc: 'AI 채점' },
                { icon: '🏆', name: '결과 공개', desc: '승패 · XP 반영' },
              ],
            },
          ]
          const activeIdx = stepIndex - 1
          const active = modes[activeIdx]
          return (
            <div className="s6-body">
              <div className="s6-section-tag">토론 모드 · 사용자 여정</div>

              {/* 상단: 3개 모드 카드 */}
              <div className="s6-mode-tabs">
                {modes.map((m, i) => (
                  <div className={`s6-mode-tab ${i === activeIdx ? 'active' : ''}`} key={i}>
                    <div className="s6-mode-tab-name">{m.name}</div>
                    <div className="s6-mode-tab-sub">{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* 하단: 선택된 모드의 사용자 여정 */}
              <div className="s6-journey" key={activeIdx}>
                {active.flow.map((s, i) => (
                  <div className="s6-j-card" key={i}>
                    <div className="s6-j-num">{String(i + 1).padStart(2, '0')}</div>
                    <div className="s6-j-icon">{s.icon}</div>
                    <div className="s6-j-name">{s.name}</div>
                    <div className="s6-j-desc">{s.desc}</div>
                    {i < active.flow.length - 1 && <div className="s6-j-arrow">→</div>}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        <Footer delay={2} />
      </div>
    </Slide>
  )
}

S6Structure.stepCount = 3
