import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createAvatar } from '@dicebear/core'
import { avataaars } from '@dicebear/collection'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import Slide from '../Slide'
import '../../styles/slide4b.css'
import s4bMobile from '../../assets/images/S4bNeed-mobile.webp'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const aiAvatars = [
  { name: 'GPT', seed: 'JudgeGPT', skinColor: ['ffdbb4'], top: ['shortCurly'], hairColor: ['724133'], facialHairProbability: 0, clothing: ['shirtCrewNeck'], clothesColor: ['3c4f5c'], accessoriesProbability: 0, eyes: ['default'], eyebrows: ['defaultNatural'], mouth: ['twinkle'] },
  { name: 'Gemini', seed: 'JudgeGemini', skinColor: ['d08b5b'], top: ['dreads01'], hairColor: ['2c1b18'], facialHair: ['beardLight'], facialHairProbability: 100, facialHairColor: ['2c1b18'], clothing: ['collarAndSweater'], clothesColor: ['25557c'], accessories: ['round'], accessoriesProbability: 100, accessoriesColor: ['000000'], eyes: ['squint'], eyebrows: ['raisedExcited'], mouth: ['twinkle'] },
  { name: 'Claude', seed: 'JudgeClaude', skinColor: ['edb98a'], top: ['bigHair'], hairColor: ['c93305'], facialHairProbability: 0, clothing: ['hoodie'], clothesColor: ['e6e6e6'], eyes: ['happy'], eyebrows: ['upDown'], mouth: ['smile'] },
]

const TOTAL_STEPS = 3 // step0: AI큰원형+공간, step1: 3개분리+모바일, step2: AI관점, step3: 뉴스레터
const ease = [0.16, 1, 0.3, 1]


export default function S4bNeed({ active, stepIndex }) {

  const [showAvatar, setShowAvatar] = useState(false)

  useEffect(() => {
    if (stepIndex === 2) {
      const timer = setTimeout(() => setShowAvatar(true), 1500)
      return () => clearTimeout(timer)
    } else if (stepIndex < 2) {
      setShowAvatar(false)
    }
  }, [stepIndex])

  useEffect(() => { if (!active) { setShowAvatar(false) } }, [active])

  const avatarUris = useMemo(() => aiAvatars.map(a => {
    const { name, ...opts } = a
    return createAvatar(avataaars, opts).toDataUri()
  }), [])

  const showCards = active && stepIndex <= 2

  return (
    <Slide id="s4b" active={active}>
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">03</span>
          <span className="header-title">서비스의 필요성</span>
        </div>

        <div className="s4b-center">
          {/* step0~2: 카드 영역 */}
          {showCards && (
            <>
              {/* ── 왼쪽: 중재자 카드 ── */}
              <motion.div
                className="s4b-bg-left"
                style={{ top: '50%', y: '-50%', opacity: 1 }}
                animate={{
                  x: 'calc(50vw - 145%)',
                }}
                transition={{ duration: 0.7, ease }}
              >
                <div className="s4b-card-inner">
                  <div className="s4b-ai-top">
                    {/* AI 원형: step0 큰 1개 → step1 이동 후 축소 → 3개 분리 */}
                    <motion.div
                      className="s4b-ai-circles-wrap"
                      animate={{
                        y: stepIndex >= 1 ? -30 : 0,
                        x: stepIndex >= 2 ? -40 : 0,
                      }}
                      transition={{ duration: 1.2, ease }}
                    >
                      {/* 큰 원형: 얼굴 + 눈 깜빡임 */}
                      <motion.div
                        className="s4b-ai-big-circle"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{
                          opacity: stepIndex === 0 ? 1 : 0,
                          scale: stepIndex === 0 ? 1 : 0.4,
                        }}
                        transition={{
                          opacity: { duration: 0.8, delay: stepIndex >= 1 ? 1.2 : 0, ease },
                          scale: { duration: 0.8, delay: stepIndex >= 1 ? 1.2 : 0, ease },
                        }}
                      >
                        <svg viewBox="0 0 200 240" width="100%" height="100%">
                          {/* AI 라벨 (원 위) */}
                          <text x="100" y="45" textAnchor="middle" fontFamily="'Cinzel',serif" fontSize="48" fontWeight="700" fill="rgba(255,255,255,0.85)" letterSpacing="0.15em">AI</text>

                          {/* 원형 테두리 */}
                          <circle cx="100" cy="150" r="70" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />

                          {/* 눈 그룹 (좌우 배회 + 깜빡임) */}
                          <g className="s4b-eyes-group">
                            {/* 왼쪽 눈 */}
                            <g style={{ transformOrigin: '80px 145px' }} className="s4b-eye">
                              <rect x="68" y="130" width="24" height="30" rx="8" fill="rgba(255,255,255,0.6)" />
                            </g>
                            {/* 오른쪽 눈 */}
                            <g style={{ transformOrigin: '120px 145px' }} className="s4b-eye">
                              <rect x="108" y="130" width="24" height="30" rx="8" fill="rgba(255,255,255,0.6)" />
                            </g>
                          </g>
                        </svg>
                      </motion.div>

                      {/* 3개 작은 원형: 이동 완료 후 등장 (step2에서 아바타) */}
                      <div className="s4b-ai-triple">
                        {[
                          { name: 'GPT', c: 'rgba(255,255,255,0.35)', y: -1 },
                          { name: 'Gemini', c: 'rgba(66,133,244,0.5)', y: 0 },
                          { name: 'Claude', c: 'rgba(217,119,67,0.6)', y: 1 },
                        ].map((ai, idx) => (
                          <motion.div
                            key={ai.name}
                            className={`s4b-ai-circle${showAvatar ? ' has-avatar' : ''}`}
                            style={{ '--c': ai.c }}
                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                            animate={{
                              opacity: stepIndex >= 1 ? 1 : 0,
                              y: stepIndex >= 1 ? ai.y * 35 : 0,
                              scale: stepIndex >= 1 ? 1 : 0.5,
                            }}
                            transition={{ duration: 1, delay: 1.8 + idx * 0.25, ease }}
                          >
                            {showAvatar ? (
                              <img className="s4b-avatar-img" src={avatarUris[idx]} alt={ai.name} />
                            ) : ai.name}
                          </motion.div>
                        ))}
                      </div>

                      {/* step2: 관점 별칭 (원형 우측, 3줄) */}
                      <AnimatePresence>
                        {stepIndex >= 2 && stepIndex <= 3 && (
                          <motion.div
                            className="s4b-persp-inline"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 80 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, delay: 0.5, ease }}
                          >
                            <span className="s4b-persp-badge">통찰의 조율자</span>
                            <span className="s4b-persp-badge">논리의 심판자</span>
                            <span className="s4b-persp-badge">균형의 현자</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* 하단 텍스트: step1~2 */}
                    <AnimatePresence>
                      {stepIndex >= 1 && stepIndex <= 3 && (
                        <motion.div
                          className="s4b-ai-desc"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 80 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1, delay: 2.8, ease }}
                        >
                          서로 다른 관점의 <strong className="s4b-gold">3개 AI</strong>가<br />
                          독립적으로 분석 · 판결하여
                          편향 없는 <strong className="s4b-gold">공정한 중재</strong>를 제공
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                </div>
              </motion.div>

              {/* ── 중앙 + 기호 ── */}
              <AnimatePresence>
                {stepIndex <= 3 && (
                  <motion.div
                    className="s4b-plus"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease }}
                  >+</motion.div>
                )}
              </AnimatePresence>

              {/* ── 오른쪽: 공간 카드 ── */}
              <motion.div
                className="s4b-bg-right"
                style={{ top: '50%', y: '-50%', opacity: 1 }}
                animate={{
                  x: 'calc(-50vw + 145%)',
                }}
                transition={{ duration: 0.7, ease }}
              >
                <div className="s4b-card-inner">
                  <div className="s4b-ai-top">
                    {/* step0~1: 3D 공간 (하나의 요소, step에 따라 scale 변화) */}
                    {stepIndex <= 1 && stepIndex >= 0 && (
                      <motion.div
                        className="s4b-space-big"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{
                          opacity: stepIndex === 0 ? 1 : 0,
                          scale: stepIndex === 0 ? 1 : 0.1,
                        }}
                        transition={{ duration: stepIndex === 0 ? 1.2 : 3, ease }}
                      >
                        <svg viewBox="0 0 260 220" width="100%" height="100%">
                          <g transform="translate(130,85)">
                            <line x1="0" y1="-50" x2="0" y2="25" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4 3" />
                            <polygon points="0,25 -75,60 0,95 75,60" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" strokeWidth="1">
                              <animate attributeName="opacity" values="0.7;1;0.7" dur="4s" repeatCount="indefinite" />
                            </polygon>
                            <polygon points="-75,60 -75,-15 0,-50 0,25" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                            <polygon points="75,60 75,-15 0,-50 0,25" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                            <polygon points="0,-50 -75,-15 0,20 75,-15" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
                            <line x1="0" y1="95" x2="0" y2="20" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
                            <circle cx="0" cy="10" r="5" fill="rgba(255,255,255,0.5)">
                              <animate attributeName="r" values="4;6;4" dur="3s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="-28" cy="30" r="3" fill="rgba(255,255,255,0.3)">
                              <animate attributeName="cy" values="30;25;30" dur="2.5s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="28" cy="30" r="3" fill="rgba(255,255,255,0.3)">
                              <animate attributeName="cy" values="30;35;30" dur="2.8s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="0" cy="55" r="3" fill="rgba(255,255,255,0.25)">
                              <animate attributeName="cx" values="0;5;0;-5;0" dur="3.5s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="-15" cy="5" r="2" fill="rgba(255,255,255,0.2)">
                              <animate attributeName="cy" values="5;0;5" dur="2s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="15" cy="5" r="2" fill="rgba(255,255,255,0.2)">
                              <animate attributeName="cy" values="5;10;5" dur="2.2s" repeatCount="indefinite" />
                            </circle>
                            <line x1="0" y1="10" x2="-28" y2="30" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" strokeDasharray="3 3">
                              <animate attributeName="stroke-dashoffset" values="0;-12" dur="2s" repeatCount="indefinite" />
                            </line>
                            <line x1="0" y1="10" x2="28" y2="30" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" strokeDasharray="3 3">
                              <animate attributeName="stroke-dashoffset" values="0;-12" dur="2s" repeatCount="indefinite" />
                            </line>
                            <line x1="0" y1="10" x2="0" y2="55" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" strokeDasharray="3 3">
                              <animate attributeName="stroke-dashoffset" values="0;-12" dur="2s" repeatCount="indefinite" />
                            </line>
                          </g>
                          <ellipse cx="130" cy="100" rx="100" ry="30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" strokeDasharray="4 4">
                            <animate attributeName="stroke-dashoffset" values="0;-16" dur="6s" repeatCount="indefinite" />
                          </ellipse>
                          <ellipse cx="130" cy="100" rx="115" ry="38" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" strokeDasharray="3 5">
                            <animate attributeName="stroke-dashoffset" values="0;16" dur="8s" repeatCount="indefinite" />
                          </ellipse>
                        </svg>
                      </motion.div>
                    )}

                    {/* step1+: 모바일 (응축 완료 + AI 분리 후 등장) */}
                    <AnimatePresence>
                      {stepIndex >= 1 && (
                        <motion.div
                          key="mobile"
                          className="s4b-mobile-frame"
                          initial={{ opacity: 0, scale: 0.1 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.5, delay: 1.8, ease }}
                        >
                          <div className="s4b-mobile-device">
                            <div className="s4b-mobile-notch" />
                            <div className="s4b-mobile-screen">
                              <img src={s4bMobile} alt="모라고라 스플래시" />
                            </div>
                            <div className="s4b-mobile-home-bar" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 하단 텍스트: step1+에서 모바일 등장 후 스르륵 */}
                    <AnimatePresence>
                      {stepIndex >= 1 && (
                        <motion.div
                          className="s4b-mobile-desc"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: -20 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1, delay: 3.5, ease }}
                        >
                          <div className="s4b-mobile-desc-main s4b-gold">누구나, 언제든</div>
                          <div className="s4b-mobile-desc-sub">일상의 논쟁을 해결하는 공간</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>


            </>
          )}

          {/* ── step3: 글로벌 AI 통계 대시보드 ── */}
          <AnimatePresence>
            {stepIndex === 3 && (
              <motion.div
                className="s4b-stats-dashboard"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.7, ease }}
                  >
                    <div className="s4b-stats-title">
                      글로벌 AI 신뢰도 · 인식 통계
                      <span className="s4b-stats-sub">2024~2025 | Stanford AI Index · Ipsos · Google</span>
                    </div>

                    <div className="s4b-stats-grid">
                      {/* 도넛 차트: AI vs 인간 공정성 신뢰 */}
                      <motion.div
                        className="s4b-chart-card"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3, ease }}
                      >
                        <div className="s4b-chart-label">AI vs 인간 공정성 신뢰</div>
                        <div className="s4b-chart-wrap">
                          <Doughnut
                            data={{
                              labels: ['AI 신뢰', '인간 신뢰'],
                              datasets: [{
                                data: [54, 46],
                                backgroundColor: ['rgba(42,74,122,0.85)', 'rgba(192,57,43,0.6)'],
                                borderColor: ['rgba(42,74,122,1)', 'rgba(192,57,43,0.8)'],
                                borderWidth: 2,
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              cutout: '65%',
                              plugins: {
                                legend: { display: false },
                                tooltip: { enabled: false },
                              },
                            }}
                          />
                          <div className="s4b-chart-center-label">
                            <span className="s4b-chart-num">54%</span>
                            <span className="s4b-chart-unit">AI 신뢰</span>
                          </div>
                        </div>
                        <div className="s4b-chart-legend">
                          <span><i style={{ background: 'rgba(42,74,122,0.85)' }} />AI 54%</span>
                          <span><i style={{ background: 'rgba(192,57,43,0.6)' }} />인간 46%</span>
                        </div>
                        <div className="s4b-chart-source">Ipsos AI Monitor 2024</div>
                      </motion.div>

                      {/* AI 긍정 인식 추이 */}
                      <motion.div
                        className="s4b-chart-card"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5, ease }}
                      >
                        <div className="s4b-chart-label">AI 긍정 인식 추이</div>
                        <div className="s4b-chart-wrap">
                          <Bar
                            data={{
                              labels: ['2022', '2023', '2024'],
                              datasets: [{
                                data: [52, 54, 55],
                                backgroundColor: ['rgba(42,74,122,0.4)', 'rgba(42,74,122,0.6)', 'rgba(42,74,122,0.9)'],
                                borderColor: 'rgba(42,74,122,1)',
                                borderWidth: 1,
                                borderRadius: 6,
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: { legend: { display: false }, tooltip: { enabled: false } },
                              scales: {
                                y: {
                                  min: 45, max: 60,
                                  ticks: { color: 'var(--text-light)', font: { size: 12 } },
                                  grid: { color: 'rgba(26,53,96,0.06)' },
                                  border: { color: 'rgba(26,53,96,0.1)' },
                                },
                                x: {
                                  ticks: { color: 'var(--text)', font: { size: 14, weight: 600 } },
                                  grid: { display: false },
                                  border: { color: 'rgba(26,53,96,0.1)' },
                                },
                              },
                            }}
                            plugins={[{
                              id: 'barLabels',
                              afterDraw(chart) {
                                const { ctx } = chart
                                const dataset = chart.data.datasets[0]
                                const meta = chart.getDatasetMeta(0)
                                const values = dataset.data
                                meta.data.forEach((bar, i) => {
                                  const x = bar.x
                                  const y = bar.y
                                  // 퍼센트 라벨
                                  ctx.save()
                                  ctx.textAlign = 'center'
                                  ctx.font = 'bold 15px Noto Sans KR, sans-serif'
                                  ctx.fillStyle = '#fff'
                                  ctx.fillText(`${values[i]}%`, x, y + 22)
                                  ctx.restore()
                                  // 증가율 화살표 (두 번째 막대부터)
                                  if (i > 0) {
                                    const diff = values[i] - values[i - 1]
                                    const prevBar = meta.data[i - 1]
                                    const midX = (prevBar.x + x) / 2
                                    const midY = Math.min(prevBar.y, y) - 10
                                    ctx.save()
                                    ctx.textAlign = 'center'
                                    ctx.font = 'bold 13px Noto Sans KR, sans-serif'
                                    ctx.fillStyle = '#1a8a7a'
                                    ctx.fillText(`↑+${diff}%p`, midX, midY)
                                    ctx.restore()
                                  }
                                })
                              },
                            }]}
                          />
                        </div>
                        <div className="s4b-chart-source">Stanford AI Index 2025 · Ipsos</div>
                      </motion.div>

                      {/* 핵심 수치 카드 */}
                      <motion.div
                        className="s4b-chart-card s4b-stats-numbers"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.7, ease }}
                      >
                        <div className="s4b-chart-label">핵심 수치</div>
                        <div className="s4b-stat-rows">
                          <div className="s4b-stat-row">
                            <span className="s4b-stat-num">67%</span>
                            <span className="s4b-stat-desc"><strong>일상 영향 기대</strong></span>
                          </div>
                          <div className="s4b-stat-row">
                            <span className="s4b-stat-num">57%</span>
                            <span className="s4b-stat-desc"><strong>기대 {'>'} 우려 역전</strong></span>
                          </div>
                          <div className="s4b-stat-row">
                            <span className="s4b-stat-num">29/32</span>
                            <span className="s4b-stat-desc"><strong>인간이 더 차별적</strong></span>
                          </div>
                        </div>
                        <div className="s4b-chart-source">Ipsos · Google 2024~2025</div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
          </AnimatePresence>

        </div>

      </div>
    </Slide>
  )
}

S4bNeed.stepCount = TOTAL_STEPS
