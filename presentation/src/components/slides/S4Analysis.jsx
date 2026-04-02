import { useEffect, useState } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import Slide from '../Slide'
import Footer from '../Footer'
import '../../styles/slide4.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const steps = [
  {
    num: '01',
    title: '시장이 존재한다',
    sub: '논쟁이 일어나는 환경은 충분히 크다',
    source: 'DataReportal 2025 / 국민통합위 2025 / KISA 2024',
  },
  {
    num: '02',
    title: '문제가 실제로 존재한다',
    sub: '논쟁은 해결되지 않고 있다',
    source: '방통위 2024 사이버폭력 실태조사',
  },
  {
    num: '03',
    title: '해결하면 사용할 가능성',
    sub: 'AI 판결 서비스는 현실적으로 쓰일 수 있다',
    source: 'Ipsos 2024 / 2025 사회문제 조사',
  },
]

/* ── Chart.js 공통 ── */
const font = { family: "'Noto Sans KR', sans-serif" }

function VizMarket({ visible }) {
  const data = {
    labels: ['SNS 보급률 (94.7%)', '갈등 심각 인식 (95.9%)', '대화 의향 (70.4%)', '13세+ SNS 이용률 (89.3%)'],
    datasets: [{
      data: visible ? [94.7, 95.9, 70.4, 89.3] : [0, 0, 0, 0],
      backgroundColor: ['#2a4a7a', '#c0392b', '#1a8a7a', '#1a3560'],
      borderRadius: 10,
      barPercentage: 0.7,
      borderSkipped: false,
    }],
  }
  const options = {
    indexAxis: 'y',
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 1400, easing: 'easeOutQuart' },
    layout: { padding: { right: 30, left: 10, top: 10, bottom: 10 } },
    scales: {
      x: {
        max: 100, min: 0,
        border: { display: false },
        grid: { color: 'rgba(26,53,96,0.04)', drawTicks: false },
        ticks: { font: { ...font, size: 18, weight: 700 }, color: '#5a6a80', callback: v => v + '%', stepSize: 25, padding: 10 },
      },
      y: {
        border: { display: false },
        grid: { display: false },
        ticks: { font: { ...font, size: 20, weight: 700 }, color: '#1B2A4A', padding: 16 },
      },
    },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
  }
  return (
    <div className={`s4-viz-inner${visible ? ' visible' : ''}`}>
      <div className="s4-chart-wrap"><Bar data={data} options={options} /></div>
    </div>
  )
}

function VizProblem({ visible }) {
  const data = {
    labels: ['악플 비율', '청소년 사이버폭력', '가해 동기: 보복', '성인 사이버폭력'],
    datasets: [{
      data: visible ? [59, 42.7, 40, 13.5] : [0, 0, 0, 0],
      backgroundColor: ['#8b2e2e', '#c0392b', '#2a4a7a', '#8a95a5'],
      borderRadius: 8,
      barThickness: 36,
      borderSkipped: false,
    }],
  }
  const options = {
    indexAxis: 'y',
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 1400, easing: 'easeOutQuart' },
    layout: { padding: { right: 20 } },
    scales: {
      x: { max: 70, border: { display: false }, grid: { color: 'rgba(26,53,96,0.04)', drawTicks: false }, ticks: { font: { ...font, size: 15, weight: 500 }, color: '#8a95a5', callback: v => v + '%', padding: 8 } },
      y: { border: { display: false }, grid: { display: false }, ticks: { font: { ...font, size: 18, weight: 700 }, color: '#1B2A4A', padding: 12 } },
    },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
  }
  return (
    <div className={`s4-viz-inner${visible ? ' visible' : ''}`}>
      <div className="s4-chart-wrap"><Bar data={data} options={options} /></div>
    </div>
  )
}

function VizOpportunity({ visible }) {
  const data = {
    labels: ['AI 공정성 신뢰', '인간 공정성 신뢰'],
    datasets: [{
      data: [54, 46],
      backgroundColor: ['#1a8a7a', 'rgba(26,53,96,0.08)'],
      hoverBackgroundColor: ['#2aaa96', 'rgba(26,53,96,0.12)'],
      borderWidth: 0,
      cutout: '72%',
      spacing: 4,
    }],
  }
  const options = {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 1200, easing: 'easeOutQuart' },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
  }
  return (
    <div className={`s4-viz-inner${visible ? ' visible' : ''}`}>
      <div className="s4-chart-donut-layout">
        <div className="s4-chart-donut">
          <Doughnut data={data} options={options} />
          <div className="s4-donut-center">
            <span className="s4-donut-num">54%</span>
            <span className="s4-donut-sub">AI 신뢰</span>
          </div>
        </div>
        <div className="s4-donut-info">
          <div className="s4-donut-row">
            <span className="s4-donut-dot teal" />
            <div>
              <div className="s4-donut-label">AI 공정성 신뢰</div>
              <div className="s4-donut-val teal">54%</div>
            </div>
          </div>
          <div className="s4-donut-vs">vs</div>
          <div className="s4-donut-row">
            <span className="s4-donut-dot dim" />
            <div>
              <div className="s4-donut-label">인간 공정성 신뢰</div>
              <div className="s4-donut-val">45%</div>
            </div>
          </div>
        </div>
      </div>
      <div className="s4-viz-conclusion">
        온라인 논쟁 환경에서 객관적 판단을 제공하는 서비스에 대한 수요는 충분히 존재
      </div>
    </div>
  )
}

const vizComponents = [VizMarket, VizProblem, VizOpportunity]
const STEP_COUNT = 2

export default function S4Analysis({ active, stepIndex }) {
  const [litCards, setLitCards] = useState(0)

  useEffect(() => {
    if (!active) { setLitCards(0); return }
    const target = Math.min(stepIndex + 1, steps.length)
    if (target <= litCards) return
    let count = litCards
    const timer = setInterval(() => {
      count++
      setLitCards(count)
      if (count >= target) clearInterval(timer)
    }, 300)
    return () => clearInterval(timer)
  }, [active, stepIndex])

  const VizComp = vizComponents[Math.min(stepIndex, vizComponents.length - 1)]

  return (
    <Slide id="s4" active={active}>
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">03</span>
          <span className="header-title">시장 분석</span>
        </div>

        <div className="s4-content">
          {/* 좌측: 카드 사이드바 */}
          <div className="s4-sidebar">
            {steps.map((s, i) => (
              <div
                className={`s4-card${i < litCards ? ' lit' : ''}${i === litCards - 1 ? ' focus' : ''}`}
                key={i}
              >
                <span className="s4-card-num">{s.num}</span>
                <span className="s4-card-title">{s.title}</span>
                <span className="s4-card-sub">{s.sub}</span>
                <span className="s4-card-source">{s.source}</span>
              </div>
            ))}
          </div>

          {/* 우측: 시각화 */}
          <div className="s4-viz">
            <VizComp visible={active && litCards > 0} />
          </div>
        </div>

        <Footer />
      </div>
    </Slide>
  )
}

S4Analysis.stepCount = STEP_COUNT
