import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide4b.css'

const TOTAL_STEPS = 3 // step0: AI큰원형+공간, step1: 3개분리+텍스트, step2: 뉴스레터, step3: 서비스 필요성
const ease = [0.16, 1, 0.3, 1]

const stats = [
  { title: 'AI 긍정 인식 상승 추세', source: 'Stanford AI Index 2025 / Ipsos', text: '26개국 중 18개국에서 AI가 단점보다 장점이 많다는 응답 증가. 글로벌 AI 긍정 비율 52% → 55% (2022→2024)' },
  { title: 'AI 사용·기대감 상승', source: 'Google / Ipsos, 2025', text: '전 국가에서 AI 사용률 전년 대비 증가. AI 잠재력 기대감(57%)이 우려(43%)를 처음으로 앞질렀다.' },
  { title: 'AI vs 인간 신뢰도 비교', source: 'Ipsos AI Monitor 2024', text: 'AI가 편견 없이 공정할 것이라는 신뢰도 54%, 인간 신뢰도 45%보다 높음. 32개국 중 29개국에서 인간이 더 차별적이라고 응답.' },
  { title: '신뢰도의 명암', source: 'Stanford AI Index 2025', text: 'AI 기업의 개인 데이터 보호 신뢰도 50% → 47% 하락. AI 편견·차별 없다는 믿음도 감소 추세.' },
  { title: '국가별 격차: 아시아 vs 서구권', source: 'Ipsos 2025', text: '인도네시아(78%), 태국(74%)은 AI 긍정적 반면, 미국(37%), 프랑스(31%)는 부정적. 아시아 정부 AI 규제 신뢰도 70~81%.' },
  { title: '한국 특이점: 신뢰 투자 양극화', source: 'Aitimes', text: '한국 조직 26%가 AI 신뢰도 최고 등급, 30%는 최하 등급. 높은 데이터 준비도에도 신기술 신뢰성 투자에는 소극적.' },
]

const ticker = [
  { label: 'AI 긍정 인식 (글로벌)', value: '55%', sub: '+3%p, 2022→2024', src: 'Stanford / Ipsos' },
  { label: 'AI가 삶 변화시킬 것', value: '67%', sub: '+6%p, 2022→2024', src: 'Ipsos AI Monitor' },
  { label: 'AI 사용 흥미 > 불안', value: '57% vs 43%', sub: '', src: 'Google/Ipsos 2025' },
  { label: 'AI 공정성 신뢰', value: '54%', sub: '인간 45%보다 높음', src: 'Ipsos 2024' },
  { label: '개인정보 신뢰도', value: '47%', sub: '↓ 전년 50%', src: 'Stanford AI Index 2025' },
  { label: '한국 AI 신뢰 고급', value: '26%', sub: 'vs 최하 30%', src: '국내 AI 신뢰지수' },
]

export default function S4bNeed({ active, stepIndex }) {
  const [statIdx, setStatIdx] = useState(0)

  useEffect(() => {
    if (!active || stepIndex !== 2) return
    const id = setInterval(() => setStatIdx(p => (p + 1) % stats.length), 8000)
    return () => clearInterval(id)
  }, [active, stepIndex])

  useEffect(() => { if (!active) setStatIdx(0) }, [active])

  const showCards = stepIndex <= 2

  return (
    <Slide id="s4b" active={active}>
      <div className="s-wrap">
        <div className="next-hint">04 해결 전략 →</div>

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
                style={{ top: '50%', y: '-50%', opacity: 0.7 }}
                animate={{
                  x: stepIndex === 2 ? 'calc(50vw - 160%)' : 'calc(50vw - 130%)',
                }}
                transition={{ duration: 0.7, ease }}
              >
                <div className="s4b-img-label">중재자</div>
                <div className="s4b-card-inner">
                  <div className="s4b-ai-top">
                    {/* AI 원형: step0 큰 1개 → step1 이동 후 축소 → 3개 분리 */}
                    <motion.div
                      className="s4b-ai-circles-wrap"
                      animate={{ y: stepIndex >= 1 ? -60 : 0 }}
                      transition={{ duration: 1.2, ease }}
                    >
                      {/* 큰 원형: 이동 후 축소 */}
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
                      >AI</motion.div>

                      {/* 3개 작은 원형: 이동 완료 후 등장 */}
                      <div className="s4b-ai-triple">
                        {[
                          { name: 'GPT', c: 'rgba(255,255,255,0.15)', y: -1 },
                          { name: 'Gemini', c: 'rgba(66,133,244,0.3)', y: 0 },
                          { name: 'Claude', c: 'rgba(217,119,67,0.4)', y: 1 },
                        ].map((ai, idx) => (
                          <motion.div
                            key={ai.name}
                            className="s4b-ai-circle"
                            style={{ '--c': ai.c }}
                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                            animate={{
                              opacity: stepIndex >= 1 ? 1 : 0,
                              y: stepIndex >= 1 ? ai.y * 35 : 0,
                              scale: stepIndex >= 1 ? 1 : 0.5,
                            }}
                            transition={{ duration: 1, delay: 1.8 + idx * 0.25, ease }}
                          >{ai.name}</motion.div>
                        ))}
                      </div>
                    </motion.div>

                    {/* 하단 텍스트: step1+에서만 */}
                    <AnimatePresence>
                      {stepIndex >= 1 && (
                        <motion.div
                          className="s4b-ai-desc"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1, delay: 2.8, ease }}
                        >
                          서로 다른 관점의 <strong>3개 AI</strong>가<br />
                          독립적으로 분석 · 판결하여<br />
                          편향 없는 <strong>공정한 중재</strong>를 제공
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* ── 중앙 + 기호 ── */}
              <AnimatePresence>
                {stepIndex <= 1 && (
                  <motion.div
                    className="s4b-plus"
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease }}
                  >+</motion.div>
                )}
              </AnimatePresence>

              {/* ── 오른쪽: 공간 카드 ── */}
              <motion.div
                className="s4b-bg-right"
                style={{ top: '50%', y: '-50%', opacity: 0.7 }}
                animate={{
                  x: stepIndex === 2 ? 'calc(-50vw + 160%)' : 'calc(-50vw + 130%)',
                }}
                transition={{ duration: 0.7, ease }}
              >
                <div className="s4b-img-label">공간</div>
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
                            <line x1="0" y1="-50" x2="0" y2="25" stroke="rgba(201,168,76,0.06)" strokeWidth="1" strokeDasharray="4 3" />
                            <polygon points="0,25 -75,60 0,95 75,60" fill="rgba(201,168,76,0.04)" stroke="rgba(201,168,76,0.15)" strokeWidth="1">
                              <animate attributeName="opacity" values="0.7;1;0.7" dur="4s" repeatCount="indefinite" />
                            </polygon>
                            <polygon points="-75,60 -75,-15 0,-50 0,25" fill="rgba(201,168,76,0.06)" stroke="rgba(201,168,76,0.2)" strokeWidth="1" />
                            <polygon points="75,60 75,-15 0,-50 0,25" fill="rgba(201,168,76,0.03)" stroke="rgba(201,168,76,0.15)" strokeWidth="1" />
                            <polygon points="0,-50 -75,-15 0,20 75,-15" fill="rgba(201,168,76,0.08)" stroke="rgba(201,168,76,0.25)" strokeWidth="1.5" />
                            <line x1="0" y1="95" x2="0" y2="20" stroke="rgba(201,168,76,0.25)" strokeWidth="1.5" />
                            <circle cx="0" cy="10" r="5" fill="rgba(201,168,76,0.4)">
                              <animate attributeName="r" values="4;6;4" dur="3s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="-28" cy="30" r="3" fill="rgba(201,168,76,0.2)">
                              <animate attributeName="cy" values="30;25;30" dur="2.5s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="28" cy="30" r="3" fill="rgba(201,168,76,0.2)">
                              <animate attributeName="cy" values="30;35;30" dur="2.8s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="0" cy="55" r="3" fill="rgba(201,168,76,0.15)">
                              <animate attributeName="cx" values="0;5;0;-5;0" dur="3.5s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="-15" cy="5" r="2" fill="rgba(201,168,76,0.12)">
                              <animate attributeName="cy" values="5;0;5" dur="2s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="15" cy="5" r="2" fill="rgba(201,168,76,0.12)">
                              <animate attributeName="cy" values="5;10;5" dur="2.2s" repeatCount="indefinite" />
                            </circle>
                            <line x1="0" y1="10" x2="-28" y2="30" stroke="rgba(201,168,76,0.1)" strokeWidth="0.8" strokeDasharray="3 3">
                              <animate attributeName="stroke-dashoffset" values="0;-12" dur="2s" repeatCount="indefinite" />
                            </line>
                            <line x1="0" y1="10" x2="28" y2="30" stroke="rgba(201,168,76,0.1)" strokeWidth="0.8" strokeDasharray="3 3">
                              <animate attributeName="stroke-dashoffset" values="0;-12" dur="2s" repeatCount="indefinite" />
                            </line>
                            <line x1="0" y1="10" x2="0" y2="55" stroke="rgba(201,168,76,0.1)" strokeWidth="0.8" strokeDasharray="3 3">
                              <animate attributeName="stroke-dashoffset" values="0;-12" dur="2s" repeatCount="indefinite" />
                            </line>
                          </g>
                          <ellipse cx="130" cy="100" rx="100" ry="30" fill="none" stroke="rgba(201,168,76,0.06)" strokeWidth="0.8" strokeDasharray="4 4">
                            <animate attributeName="stroke-dashoffset" values="0;-16" dur="6s" repeatCount="indefinite" />
                          </ellipse>
                          <ellipse cx="130" cy="100" rx="115" ry="38" fill="none" stroke="rgba(201,168,76,0.04)" strokeWidth="0.5" strokeDasharray="3 5">
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
                              <img src={new URL('../../assets/images/S4bNeed-mobile.png', import.meta.url).href} alt="모라고라 스플래시" />
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
                          animate={{ opacity: 1, y: -80 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1, delay: 3.5, ease }}
                        >
                          <div className="s4b-mobile-desc-main">누구나, 언제든</div>
                          <div className="s4b-mobile-desc-sub">일상의 논쟁을 해결하는 공간</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* ── step2: 뉴스레터 패널 ── */}
              <AnimatePresence>
                {stepIndex === 2 && (
                  <motion.div
                    className="s4b-newsletter"
                    initial={{ opacity: 0, x: -60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ duration: 0.6, delay: 0.3, ease }}
                  >
                    <div className="s4b-nl-header">
                      글로벌 AI 신뢰도·인식 통계 2024~2025
                      <span className="s4b-nl-sub">AI 공정성 신뢰 54% (Ipsos, n=23,685) · 에이전틱 AI 투자 한국 4% (IBM, n=2,375)</span>
                    </div>
                    <div className="s4b-nl-slot">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={statIdx}
                          className="s4b-nl-item"
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -16 }}
                          transition={{ duration: 0.5, ease }}
                        >
                          <div className="s4b-nl-title">{stats[statIdx].title}</div>
                          <div className="s4b-nl-text">{stats[statIdx].text}</div>
                          <div className="s4b-nl-source">{stats[statIdx].source}</div>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                    <div className="s4b-nl-dots">
                      {stats.map((_, i) => (
                        <span key={i} className={`s4b-dot${i === statIdx ? ' active' : ''}`} />
                      ))}
                    </div>
                    <div className="s4b-nl-ticker">
                      <div className="s4b-ticker-track">
                        {[...ticker, ...ticker].map((t, i) => (
                          <span className="s4b-ticker-item" key={i}>
                            <strong>{t.label}</strong> {t.value} {t.sub && `(${t.sub})`} — {t.src}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* step3: 서비스 필요성 내용 */}
          <AnimatePresence>
            {stepIndex === 3 && (
              <motion.div
                className="s4b-content"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.7, delay: 0.2, ease }}
              >
                <div className="s4b-headline">
                  논쟁을 감정이 아닌 <em>논리</em>로,<br />
                  판단을 한 사람이 아닌 <em>다수</em>로
                </div>
                <div className="s4b-points">
                  <div className="s4b-point">
                    <span className="s4b-point-num">1</span>
                    <div className="s4b-point-text">
                      <strong>이성적 중재자</strong>가 감정적 대립을 논거 중심으로 정리
                    </div>
                  </div>
                  <div className="s4b-point">
                    <span className="s4b-point-num">2</span>
                    <div className="s4b-point-text">
                      <strong>누구나 참여할 수 있는 공간</strong>에서 일상의 논쟁을 해결
                    </div>
                  </div>
                  <div className="s4b-point">
                    <span className="s4b-point-num">3</span>
                    <div className="s4b-point-text">
                      <strong>복수의 심판</strong>으로 편향 없는 공정한 판결
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Footer />
      </div>
    </Slide>
  )
}

S4bNeed.stepCount = TOTAL_STEPS
