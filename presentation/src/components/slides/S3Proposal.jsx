import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Slide from '../Slide'
import Footer from '../Footer'
import { initCountUps } from '../../utils/animations'
import '../../styles/slide3.css'

const TOTAL_STEPS = 0 // 스텝 없음 — 카드만 표시
const ease = [0.16, 1, 0.3, 1]

const conclusions = [
  { main: '한국 사회는 갈등으로 가득하다', sub: '(5대 사회갈등 심각 인식 — 74%)' },
  { main: '그 갈등은 감정을 건드린다', sub: '(사회갈등 접할 때 부정적 감정 — 81%)' },
  { main: '그래도 사람들은 대화하고 싶어한다', sub: '(다른 의견과 대화할 의향 — 70%)' },
]


export default function S3Proposal({ active, stepIndex }) {
  const ref = useRef(null)
  const countInitRef = useRef(false)
  useEffect(() => {
    if (active && !countInitRef.current) {
      countInitRef.current = true
      initCountUps(ref.current, 800)
    }
    if (!active) countInitRef.current = false
  }, [active])

  return (
    <Slide id="s3" active={active}>
      <div className="s-wrap" ref={ref}>
        <div className="header">
          <span className="page-num">01</span>
          <span className="header-title">제안 배경</span>
        </div>

        {/* 출처 헤더 — step1에서 fade out */}
        {/* 카드 3열 — 각 카드 개별 제어 */}
        <div className="cards">
          {/* ① 5대 갈등 */}
          <motion.div
            className="card"
            animate={{
              opacity: !active ? 0 : stepIndex === 0 ? 1 : stepIndex === 1 ? [0, 0, 0.35, 0.35, 0] : 0,
              y: !active ? 24 : 0,
            }}
            transition={{
              duration: stepIndex === 1 ? 5 : 0.6,
              times: stepIndex === 1 ? [0, 0.35, 0.5, 0.75, 1] : undefined,
              delay: active && stepIndex === 0 ? 0.8 : 0,
              ease,
            }}
          >
            <div className="card-graphic">
              <div className="illust" style={{ overflow: 'hidden', borderRadius: '8px', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <svg viewBox="0 0 240 170" width="100%" style={{ display: 'block' }}>
                    {[
                      { label: '진보·보수', w: 129, pct: '92%', delay: '1.0s' },
                      { label: '부유·서민', w: 108, pct: '77%', delay: '1.12s' },
                      { label: '기성·청년', w: 101, pct: '72%', delay: '1.24s' },
                      { label: '수도·지방', w: 97, pct: '70%', delay: '1.36s' },
                      { label: '남성·여성', w: 85, pct: '61%', delay: '1.48s' },
                    ].map((d, i) => {
                      const y = 5 + i * 30
                      return (
                        <g className="bar-row" style={{ '--delay': d.delay }} key={i}>
                          <text x="0" y={y + 12} fontFamily="'Noto Sans KR',sans-serif" fontSize="14" fontWeight="600" fill="#4a5670">{d.label}</text>
                          <rect x="78" y={y} width="110" height="14" rx="3" fill="rgba(26,53,96,0.08)" />
                          <rect x="78" y={y} width={d.w * 0.78} height="14" rx="3" fill="rgba(26,53,96,1)" />
                          <text x="196" y={y + 12} fontFamily="'Noto Sans KR',sans-serif" fontSize="14" fontWeight="600" fill="#1B2A4A">{d.pct}</text>
                        </g>
                      )
                    })}
                  </svg>
                </div>
              </div>
            </div>
            <motion.div
              className="card-text"
              animate={{ opacity: stepIndex === 0 ? 1 : 0 }}
              transition={{ duration: 0.4, ease }}
            >
              <div className="stat-num gold" data-count="74" data-suffix="%" data-delay="1000" />
              <div className="stat-label">5대 사회갈등 심각 인식</div>
            </motion.div>
          </motion.div>

          {/* ② 부정적 감정 */}
          <motion.div
            className="card"
            animate={{
              opacity: !active ? 0 : stepIndex === 0 ? 1 : stepIndex === 2 ? [0, 0, 0.35, 0.35, 0] : 0,
              y: !active ? 24 : 0,
            }}
            transition={{
              duration: stepIndex === 2 ? 5 : 0.6,
              times: stepIndex === 2 ? [0, 0.35, 0.5, 0.75, 1] : undefined,
              delay: active && stepIndex === 0 ? 2.0 : 0,
              ease,
            }}
          >
            <div className="card-graphic">
              <div className="illust" style={{ overflow: 'hidden', borderRadius: '8px', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <svg viewBox="0 0 220 175" width="100%" style={{ display: 'block' }}>
                    <g style={{ opacity: 0, animation: 'fade-in 0.5s ease forwards 2.2s' }}>
                      <path d="M110,15 A60,60 0 0,1 163.7,99.5 L110,75 Z" fill="rgba(217,64,64,1)" stroke="var(--bg)" strokeWidth="1.5" />
                      <circle cx="133" cy="52" r="3" fill="rgba(255,220,200,0.25)" />
                      <circle cx="143" cy="52" r="3" fill="rgba(255,220,200,0.25)" />
                      <path d="M130,48 L136,51" stroke="rgba(255,220,200,0.2)" strokeWidth="1" strokeLinecap="round" />
                      <path d="M146,48 L140,51" stroke="rgba(255,220,200,0.2)" strokeWidth="1" strokeLinecap="round" />
                      <path d="M131,60 Q138,56 145,60" stroke="rgba(255,220,200,0.2)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    </g>
                    <g style={{ opacity: 0, animation: 'fade-in 0.5s ease forwards 2.4s' }}>
                      <path d="M163.7,99.5 A60,60 0 0,1 103.3,134.6 L110,75 Z" fill="rgba(232,190,40,1)" stroke="var(--bg)" strokeWidth="1.5" />
                      <line x1="121" y1="97" x2="128" y2="100" stroke="rgba(80,40,0,0.15)" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="138" y1="97" x2="131" y2="100" stroke="rgba(80,40,0,0.15)" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="125" cy="100" r="2" fill="rgba(80,40,0,0.15)" />
                      <circle cx="134" cy="100" r="2" fill="rgba(80,40,0,0.15)" />
                      <path d="M124,108 Q129,105 134,108" stroke="rgba(80,40,0,0.15)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    </g>
                    <g style={{ opacity: 0, animation: 'fade-in 0.5s ease forwards 2.6s' }}>
                      <path d="M103.3,134.6 A60,60 0 0,1 56.3,99.5 L110,75 Z" fill="rgba(80,120,200,1)" stroke="var(--bg)" strokeWidth="1.5" />
                      <line x1="78" y1="105" x2="86" y2="105" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="82" y1="105" x2="82" y2="114" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="88" y1="105" x2="96" y2="105" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="92" y1="105" x2="92" y2="114" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" />
                    </g>
                    <g style={{ opacity: 0, animation: 'fade-in 0.5s ease forwards 2.8s' }}>
                      <path d="M56.3,99.5 A60,60 0 0,1 54.2,52.9 L110,75 Z" fill="rgba(120,120,120,1)" stroke="var(--bg)" strokeWidth="1.5" />
                      <circle cx="68" cy="73" r="3" fill="rgba(220,220,220,0.15)" />
                      <circle cx="78" cy="73" r="3" fill="rgba(220,220,220,0.15)" />
                      <line x1="66" y1="81" x2="80" y2="81" stroke="rgba(220,220,220,0.15)" strokeWidth="1.5" strokeLinecap="round" />
                    </g>
                    <g style={{ opacity: 0, animation: 'fade-in 0.5s ease forwards 2.9s' }}>
                      <path d="M54.2,52.9 A60,60 0 0,1 110,15 L110,75 Z" fill="rgba(180,180,180,1)" stroke="var(--bg)" strokeWidth="1.5" />
                    </g>
                    <path d="M110,75 L110,15 A60,60 0 0,1 163.7,99.5 A60,60 0 0,1 103.3,134.6 A60,60 0 0,1 56.3,99.5 A60,60 0 0,1 54.2,52.9 L110,75"
                      fill="none" stroke="#e8a838" strokeWidth="2.5" strokeLinejoin="round"
                      style={{ opacity: 0, animation: 'fade-in 0.6s ease forwards 3s' }} />
                    <circle cx="110" cy="75" r="14" fill="#1a1714" stroke="rgba(201,168,76,0.3)" strokeWidth="1" style={{ opacity: 0, animation: 'fade-in 0.4s ease forwards 3s' }} />
                    <circle cx="110" cy="75" r="3" fill="rgba(201,168,76,0.5)" style={{ opacity: 0, animation: 'fade-in 0.4s ease forwards 3s' }} />
                    <g style={{ opacity: 0, animation: 'fade-in 0.5s ease forwards 3.2s' }}>
                      <circle cx="70" cy="148" r="4" fill="rgba(217,64,64,1)" /><text x="78" y="151" fontFamily="'Noto Sans KR',sans-serif" fontSize="7" fill="#4a5670">분노 27%</text>
                      <circle cx="120" cy="148" r="4" fill="rgba(232,190,40,1)" /><text x="128" y="151" fontFamily="'Noto Sans KR',sans-serif" fontSize="7" fill="#4a5670">혐오 22%</text>
                    </g>
                    <g style={{ opacity: 0, animation: 'fade-in 0.5s ease forwards 3.4s' }}>
                      <circle cx="70" cy="162" r="4" fill="rgba(80,120,200,1)" /><text x="78" y="165" fontFamily="'Noto Sans KR',sans-serif" fontSize="7" fill="#4a5670">슬픔 16%</text>
                      <circle cx="120" cy="162" r="4" fill="rgba(120,120,120,1)" /><text x="128" y="165" fontFamily="'Noto Sans KR',sans-serif" fontSize="7" fill="#4a5670">부정 16%</text>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
            <motion.div
              className="card-text"
              animate={{ opacity: stepIndex === 0 ? 1 : 0 }}
              transition={{ duration: 0.4, ease }}
            >
              <div className="stat-num amber" data-count="81" data-suffix="%" data-delay="2200" />
              <div className="stat-label">"부정적 감정을 느낀다"</div>
              <div className="stat-label"><span style={{ fontSize: '0.85em', color: 'var(--text-dim)' }}>사회갈등을 접할 때</span></div>
            </motion.div>
          </motion.div>

          {/* ③ 대화 의향 */}
          <motion.div
            className="card"
            animate={{
              opacity: active ? 1 : 0,
              y: active ? 0 : 24,
            }}
            transition={{
              duration: 0.6,
              delay: active ? 3.2 : 0,
              ease,
            }}
          >
            <div className="card-graphic">
              <div className="illust">
                <svg viewBox="0 0 160 110" width="100%" height="100%">
                  <circle cx="45" cy="55" r="16" fill="none" stroke="rgba(26,53,96,1)" strokeWidth="1.5" />
                  <circle cx="45" cy="50" r="6" fill="rgba(26,53,96,0.6)" />
                  <path d="M35,62 Q45,70 55,62" stroke="rgba(26,53,96,0.6)" strokeWidth="1.5" fill="none" />
                  <circle cx="115" cy="55" r="16" fill="none" stroke="rgba(192,57,43,1)" strokeWidth="1.5" />
                  <circle cx="115" cy="50" r="6" fill="rgba(192,57,43,0.6)" />
                  <path d="M105,62 Q115,70 125,62" stroke="rgba(192,57,43,0.6)" strokeWidth="1.5" fill="none" />
                  <line x1="62" y1="52" x2="98" y2="52" stroke="rgba(26,53,96,0.6)" strokeWidth="1.5" strokeDasharray="4 3">
                    <animate attributeName="stroke-dashoffset" values="0;-14" dur="2s" repeatCount="indefinite" />
                  </line>
                  <line x1="98" y1="58" x2="62" y2="58" stroke="rgba(192,57,43,0.6)" strokeWidth="1.5" strokeDasharray="4 3">
                    <animate attributeName="stroke-dashoffset" values="0;-14" dur="2s" repeatCount="indefinite" />
                  </line>
                </svg>
              </div>
            </div>
            <motion.div
              className="card-text"
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease }}
            >
              <div className="stat-num green" data-count="70" data-suffix="%" data-delay="3400" />
              <div className="stat-label">다른 의견과 대화할 의향<br /><span style={{ fontSize: '0.85em', color: 'var(--text-dim)' }}>소통의 여지 충분</span></div>
            </motion.div>
          </motion.div>
        </div>

        <Footer />
      </div>
    </Slide>
  )
}

S3Proposal.stepCount = TOTAL_STEPS
