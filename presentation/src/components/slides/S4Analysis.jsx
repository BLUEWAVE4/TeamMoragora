import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Slide from '../Slide'
import Footer from '../Footer'
import { initCountUps } from '../../utils/animations'
import '../../styles/slide4.css'

const TOTAL_STEPS = 3 // step0: 브릿지, step1: 카드1, step2: 카드2

const ease = [0.16, 1, 0.3, 1]

const cards = [
  {
    tag: null,
    icon: null,
    title: '감정은 커지고, 중재자는 없다',
    desc: '갈등과 논쟁에서 감정적 대립은 흔하게 발생하고\n이를 해결해줄\n이성적이고 논리적인 중재자는 부재이다',
  },
  {
    tag: null,
    icon: null,
    title: '대화하고 싶어도 방법이 없다',
    desc: '대화 의향은 70%이지만\n감정을 배제하고 논거만으로\n소통할 수 있는 플랫폼이 없다',
  },
]

export default function S4Analysis({ active, stepIndex }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.closest('.slide')?.setAttribute('data-steps', TOTAL_STEPS)
    }
  }, [])

  useEffect(() => {
    if (active && ref.current) {
      initCountUps(ref.current, 800)
    }
  }, [active])

  return (
    <Slide id="s4" active={active}>
      <div className="s-wrap" ref={ref}>
        <div className="next-hint">03 해결 전략 →</div>

        <div className="header">
          <span className="page-num">02</span>
          <span className="header-title">원인 분석</span>
        </div>

        {/* 중앙 영역: 브릿지 텍스트 & 카드 */}
        <div className="s4-center">
          {/* step1 좌우 배경 이미지 */}
          <AnimatePresence>
            {stepIndex === 1 && (
              <>
                <motion.div
                  className="s4-bg-left"
                  style={{ y: '-50%' }}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 0.4, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.8, delay: 0.3, ease }}
                >
                  <div className="s4-img-label">더 로직 (KBS2, 2026.01~02)</div>
                  <img src={new URL('../../assets/images/s4-left.png', import.meta.url).href} alt="" />
                </motion.div>
                <motion.div
                  className="s4-bg-right"
                  style={{ y: '-50%' }}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 0.4, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.8, delay: 0.3, ease }}
                >
                  <div className="s4-img-label">베팅 온 팩트 (Wavve, 2026.03~)</div>
                  <img src={new URL('../../assets/images/s4-right.png', import.meta.url).href} alt="" />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* step0: "그런데 왜?" — step1에서 fade out */}
          <AnimatePresence>
            {stepIndex === 0 && (
              <motion.div
                className="s4-bridge"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, ease }}
              >
                <span className="source-main">그런데 왜?</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* step1~2: 카드 한 장씩 중앙에 */}
          <AnimatePresence mode="wait">
            {stepIndex >= 1 && stepIndex <= 2 && (
              <motion.div
                className="s4-center-card"
                key={stepIndex}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.6, ease }}
              >
                <div className="card">
                  {cards[stepIndex - 1].tag && <span className="card-tag">{cards[stepIndex - 1].tag}</span>}
                  {cards[stepIndex - 1].icon && <div className="card-icon">{cards[stepIndex - 1].icon}</div>}
                  <div className="card-title">{cards[stepIndex - 1].title}</div>
                  <div className="card-desc">{cards[stepIndex - 1].desc}</div>
                </div>
                {stepIndex === 1 && (
                  <div className="card s4-table-card">
                    <table className="s4-compare-table">
                      <thead>
                        <tr>
                          <th></th>
                          <th>더 로직</th>
                          <th>베팅 온 팩트</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="row-label">심판</td>
                          <td>제작진 (논제 이탈 판정)</td>
                          <td>일반인 투표 (설득력 판정)</td>
                        </tr>
                        <tr>
                          <td className="row-label">승패 기준</td>
                          <td>규칙 위반 누적</td>
                          <td>여론 투표</td>
                        </tr>
                        <tr>
                          <td className="row-label">핵심 문제</td>
                          <td>심판 권한이 너무 강함</td>
                          <td>감정·편향 투표에 취약</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Footer />
      </div>
    </Slide>
  )
}

S4Analysis.stepCount = TOTAL_STEPS
