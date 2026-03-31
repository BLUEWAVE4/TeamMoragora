import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide5.css'

export default function S5Strategy({ active }) {
  return (
    <Slide id="s5" active={active}>
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">03</span>
          <span className="header-title">해결 전략</span>
        </div>

        <div className="body">
          {/* 좌측 */}
          <div className="strategy-left">
            <div className="strategy-tag">Core Strategy</div>
            <div className="strategy-headline">
              논쟁의 마침표는<br />
              <em>공정한 복수의 심판</em>에서<br />
              나온다
            </div>
            <div className="strategy-desc">
              단일 판단은 편향을 피할 수 없다.<br />
              인간도, AI도 마찬가지다.<br /><br />
              모라고라는 서로 다른 관점을 가진<br />
              3개의 AI 심판과 시민 투표를 결합해<br />
              어느 한 쪽도 결론을 독점하지 못하게 한다.
            </div>
            <div className="ratio-wrap">
              <div className="ratio-label">Verdict Weight</div>
              <div className="ratio-bar-wrap">
                <div className="ratio-ai"><span className="ratio-text">AI 60%</span></div>
                <div className="ratio-citizen"><span className="ratio-text">시민 40%</span></div>
              </div>
              <div className="ratio-legend">
                <div className="ratio-legend-item"><div className="legend-dot ai" />AI 3사 독립 판결 합산</div>
                <div className="ratio-legend-item"><div className="legend-dot cit" />시민 실시간 투표</div>
              </div>
            </div>
          </div>

          {/* 우측 */}
          <div className="strategy-right">
            <div className="flow-title">Verdict Flow</div>
            <div className="flow">
              {[
                { num: '01', name: '입론', desc: '양측이 각자의 주장을 논증과 근거로 제시한다' },
                { num: '02', name: '반론', desc: '상대의 주장에 반박하며 논거를 심화시킨다' },
                {
                  num: '03', name: 'AI 3사 독립 판결', desc: '논리·균형·맥락 각각의 관점에서 동시에 판결',
                  chips: [
                    { cls: 'gpt', label: 'GPT · 논리구조' },
                    { cls: 'gem', label: 'Gemini · 균형' },
                    { cls: 'cla', label: 'Claude · 맥락' },
                  ]
                },
                { num: '04', name: '시민 투표', desc: '실시간 시민 참여로 AI 판결과 균형을 이룬다' },
                { num: '⚖', name: '최종 판결', desc: 'AI 60% + 시민 40% — 논쟁의 마침표', final: true },
              ].map((step, i) => (
                <div className={`flow-step${step.final ? ' final' : ''}`} key={i}>
                  <div className="step-indicator">
                    <div className="step-circle">{step.num}</div>
                    <div className="step-line" />
                  </div>
                  <div className="step-content">
                    <div className="step-name">{step.name}</div>
                    <div className="step-desc">{step.desc}</div>
                    {step.chips && (
                      <div className="judge-chips">
                        {step.chips.map((c, j) => (
                          <div className="jchip" key={j}>
                            <div className={`jdot ${c.cls}`} />
                            <span className="jlabel">{c.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Footer delay={2} />
      </div>
    </Slide>
  )
}
