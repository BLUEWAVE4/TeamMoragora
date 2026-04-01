import { useState, useEffect, useCallback, useRef } from 'react'

export function useNavigator(totalSlides) {
  const [current, setCurrent] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const stepCountsRef = useRef({})
  const stateRef = useRef({ current: 0, stepIndex: 0 })

  // 최신 state를 ref에 동기화
  stateRef.current = { current, stepIndex }

  // 슬라이드별 스텝 수 등록
  const registerSteps = (slideIdx, count) => {
    stepCountsRef.current[slideIdx] = count
  }

  const goTo = useCallback((idx) => {
    setStepIndex(0)
    setCurrent(idx)
  }, [])

  const next = useCallback(() => {
    const { current: cur, stepIndex: si } = stateRef.current
    const totalSteps = stepCountsRef.current[cur] || 0
    if (si < totalSteps) {
      setStepIndex(si + 1)
    } else if (cur < totalSlides - 1) {
      setStepIndex(0)
      setCurrent(cur + 1)
    }
  }, [totalSlides])

  const prev = useCallback(() => {
    const { current: cur, stepIndex: si } = stateRef.current
    if (si > 0) {
      setStepIndex(si - 1)
    } else if (cur > 0) {
      setStepIndex(0)
      setCurrent(cur - 1)
    }
  }, [])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        next()
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        prev()
      }
      if (e.key === 'Home') { e.preventDefault(); goTo(0) }
      if (e.key === 'End') { e.preventDefault(); goTo(totalSlides - 1) }
    }

    const handleClick = (e) => {
      if (e.target.closest('button, a, input')) return
      if (e.clientX > window.innerWidth / 2) next()
      else prev()
    }

    document.addEventListener('keydown', handleKey)
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('click', handleClick)
    }
  }, [next, prev, goTo, totalSlides])

  return { current, total: totalSlides, stepIndex, registerSteps, next, prev, goTo, advanceStep: next }
}
