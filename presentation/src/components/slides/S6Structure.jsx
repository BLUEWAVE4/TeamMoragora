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
                <div className="s6-user-icon">👤</div>
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
                    <div className="s6-irow-pair">
                      <div className="s6-irow-v half"><span className="s6-tag purple">Store</span><span className="s6-files">Zustand | Context</span></div>
                      <div className="s6-irow-v half"><span className="s6-tag blue">Services</span><span className="s6-files">api | socket</span></div>
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

              {/* HTTP / WS 화살표 */}
              <div className="s6-proto">
                <div className="s6-proto-label">HTTP</div>
                <div className="s6-proto-line" />
                <div className="s6-proto-label ws">WS</div>
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

              {/* → API 화살표 */}
              <div className="s6-conn-api" />

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

        {/* ── step 1: 사용자 여정 ── */}
        {stepIndex === 1 && (
          <div className="s6-body">
            <div className="s6-section-tag">사용자 여정</div>
            <div className="s6-journey">
              {[
                { icon: '✏️', name: '논쟁 생성', desc: '주제 선택\n모드 · 카테고리 설정' },
                { icon: '⚔️', name: '입론 · 반론', desc: '2라운드 논증 작성\nAI 소크라테스 코칭' },
                { icon: '🤖', name: 'AI 3사 판결', desc: 'GPT · Gemini · Claude\n5개 기준 독립 채점' },
                { icon: '🗳️', name: '시민 투표', desc: '실시간 커뮤니티 참여\n투표 기간 설정' },
                { icon: '⚖️', name: '최종 판결', desc: 'AI 75% + 시민 25%\n승자 결정' },
                { icon: '🏆', name: '랭킹 반영', desc: 'XP 부여\n티어 업데이트' },
              ].map((s, i) => (
                <div className="s6-j-card" key={i}>
                  <div className="s6-j-num">{String(i + 1).padStart(2, '0')}</div>
                  <div className="s6-j-icon">{s.icon}</div>
                  <div className="s6-j-name">{s.name}</div>
                  <div className="s6-j-desc">{s.desc}</div>
                  {i < 5 && <div className="s6-j-arrow">→</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── step 2: 토론 모드 + 모드별 여정 ── */}
        {stepIndex === 2 && (
          <div className="s6-body">
            <div className="s6-section-tag">3가지 토론 모드</div>
            <div className="s6-modes-full">
              {[
                {
                  name: 'Solo', sub: 'AI 소크라테스와 연습',
                  flow: ['주제 입력', '입장 선택', '주장 작성', 'AI 코칭', 'AI 반박 생성', '반론 작성', '루브릭 채점'],
                },
                {
                  name: 'Duo', sub: '1:1 실시간 토론',
                  flow: ['논쟁 생성', '초대코드 공유', '상대 입장', '1R 주장', '2R 반박', 'AI 3사 판결', '시민 투표', '최종 판결'],
                },
                {
                  name: 'Chat', sub: '실시간 채팅 토론',
                  flow: ['방 생성', '참가자 입장', '실시간 채팅', '관전자 투표', '종료 트리거', 'AI 판결', '결과 공개'],
                },
              ].map((m, i) => (
                <div className="s6-mf-col" key={i}>
                  {/* 상단: 모드 카드 */}
                  <div className="s6-mf-card">
                    <div className="s6-mf-name">{m.name}</div>
                    <div className="s6-mf-sub">{m.sub}</div>
                  </div>
                  {/* 하단: 세로 여정 */}
                  <div className="s6-mf-flow">
                    {m.flow.map((step, j) => (
                      <div className="s6-mf-step" key={j}>
                        <div className="s6-mf-dot" />
                        <div className="s6-mf-label">{step}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Footer delay={2} />
      </div>
    </Slide>
  )
}

S6Structure.stepCount = 2
