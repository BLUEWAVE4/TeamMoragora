import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Slide from '../Slide'
import Footer from '../Footer'
import { initCountUps } from '../../utils/animations'
import '../../styles/slide4.css'

const TOTAL_STEPS = 5 // step0: 브릿지, step1: 이미지 모임, step2: 중재자의 부재, step3: 공간의 부재, step4: 테이블, step5: 이미지 모임+제목변경

const ease = [0.16, 1, 0.3, 1]

const cards = [
  {
    title: '중재자의 부재',
    desc: '일상의 크고 작은 논쟁에서 제3자(중재자)가 부재하여,\n논쟁이 감정적 대립으로 확대 & 결론 없이 반복되는 문제',
  },
  {
    title: '공간의 부재',
    desc: '대화 의향(70%)은 높지만,\nTV 프로그램은 일반인이 접근하기 어려운 구조',
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

  const currentCard = stepIndex >= 3 ? 1 : 0
  const cardY = stepIndex === 2 ? '-30%' : stepIndex === 3 ? '30%' : '0%'
  const isGather = stepIndex === 1 || stepIndex === 5

  return (
    <Slide id="s4" active={active}>
      <div className="s-wrap" ref={ref}>
        <div className="next-hint">03 서비스의 필요성 →</div>

        <div className="header">
          <span className="page-num">02</span>
          <span className="header-title">원인 분석</span>
        </div>

        {/* 중앙 영역 */}
        <div className="s4-center">
          {/* 좌우 이미지 카드 — step1~5 */}
          {active && stepIndex >= 1 && stepIndex <= 5 && (
            <>
              <motion.div
                key="bg-left"
                className={`s4-bg-left ${isGather ? 's4-img-gather' : ''}`}
                initial={{ opacity: 0, x: isGather ? 'calc(50vw - 130%)' : -30, y: '-50%' }}
                animate={{
                  opacity: isGather ? 0.7 : 0.4,
                  x: isGather ? 'calc(50vw - 130%)' : 0,
                  y: '-50%',
                }}
                transition={{ duration: 0.8, delay: stepIndex === 1 ? 0.3 : 0, ease }}
              >
                <div className="s4-img-label">{stepIndex === 5 ? '중재자의 부재' : '더 로직 (KBS2, 2026.01~02)'}</div>
                <img src={new URL('../../assets/images/s4-left.png', import.meta.url).href} alt="" />
              </motion.div>
              <motion.div
                key="bg-right"
                className={`s4-bg-right ${isGather ? 's4-img-gather' : ''}`}
                initial={{ opacity: 0, x: isGather ? 'calc(-50vw + 130%)' : 30, y: '-50%' }}
                animate={{
                  opacity: isGather ? 0.7 : 0.4,
                  x: isGather ? 'calc(-50vw + 130%)' : 0,
                  y: '-50%',
                }}
                transition={{ duration: 0.8, delay: stepIndex === 1 ? 0.3 : 0, ease }}
              >
                <div className="s4-img-label">{stepIndex === 5 ? '공간의 부재' : '베팅 온 팩트 (Wavve, 2026.03~)'}</div>
                <img src={new URL('../../assets/images/s4-right.png', import.meta.url).href} alt="" />
              </motion.div>
            </>
          )}

          {/* step0: "그런데 왜?" */}
          <AnimatePresence>
            {active && stepIndex === 0 && (
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

          {/* step2~4: 중앙 카드 (step1,5에서 사라짐) */}
          <AnimatePresence>
            {stepIndex >= 2 && stepIndex <= 4 && (
              <motion.div
                className="s4-center-card"
                initial={{ opacity: 0, y: cardY }}
                animate={{ opacity: 1, y: cardY }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease }}
              >
                <div className={`card${stepIndex === 4 ? ' s4-table-card' : ''}`}>
                  <AnimatePresence mode="wait">
                    {stepIndex <= 3 ? (
                      <motion.div
                        key={currentCard}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                      >
                        <div className="card-title">{cards[currentCard].title}</div>
                        <div className="card-desc">{cards[currentCard].desc}</div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="table"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease }}
                      >
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
                      </motion.div>
                    )}
                  </AnimatePresence>
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

S4Analysis.stepCount = TOTAL_STEPS
