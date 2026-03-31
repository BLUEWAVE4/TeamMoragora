import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Slide from '../Slide'
import Footer from '../Footer'
import { initCountUps } from '../../utils/animations'
import '../../styles/slide4.css'

const TOTAL_STEPS = 3 // step0: 브릿지, step1: 카드1, step2: 카드2

const ease = [0.16, 1, 0.3, 1]

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

        {/* step0: 브릿지 — 중앙 텍스트, step1+에서 위로 축소 이동 */}
        <motion.div
          className="s4-cause-row"
          animate={{
            top: stepIndex >= 1 ? '18%' : '50%',
            x: '-50%',
            y: '-50%',
            scale: stepIndex >= 1 ? 0.65 : 1,
          }}
          transition={{ duration: 0.8, ease }}
        >
          <div className="source-header" id="s4-source">
            <span className="source-main">그런데 왜 대화가 안 되는가?</span>
          </div>
        </motion.div>

        {/* step1~2: 카드 영역 — 2열 */}
        <div className="cards s4-two-col">
          {[
            {
              tag: '중재자의 부재',
              icon: '⚖️',
              title: '판단해줄 제3자가 없다',
              desc: '감정이 앞서는 익명 소통 구조에서\n객관적으로 판단해줄\n중립적 중재자가 존재하지 않는다',
            },
            {
              tag: '서비스의 부재',
              icon: '🔧',
              title: '실행할 방법이 없다',
              desc: '대화 의향은 70%이지만\n감정을 배제하고 논거만으로\n소통할 수 있는 플랫폼이 없다',
            },
          ].map((card, idx) => (
            <motion.div
              className="card"
              key={idx}
              animate={{
                opacity: stepIndex > idx ? 1 : 0,
                y: stepIndex > idx ? 0 : 30,
              }}
              transition={{ duration: 0.6, ease }}
              style={{ pointerEvents: stepIndex > idx ? 'auto' : 'none' }}
            >
              <span className="card-tag">{card.tag}</span>
              <div className="card-icon">{card.icon}</div>
              <div className="card-title">{card.title}</div>
              <div className="card-desc">{card.desc}</div>
            </motion.div>
          ))}
        </div>

        <Footer />
      </div>
    </Slide>
  )
}

S4Analysis.stepCount = TOTAL_STEPS
