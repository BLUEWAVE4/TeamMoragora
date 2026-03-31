import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * 슬라이드 네비게이션 + 서브스텝 관리 훅
 *
 * 각 슬라이드 컴포넌트는 totalSteps prop으로 자기 서브스텝 수를 등록하고,
 * stepIndex를 받아 현재 몇 번째 스텝까지 보여줄지 결정한다.
 */
export function useNavigator(totalSlides) {
  const [current, setCurrent] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const stepCountsRef = useRef({}) // slideIdx → totalSteps

  // 슬라이드별 스텝 수 등록
  const registerSteps = useCallback((slideIdx, count) => {
    stepCountsRef.current[slideIdx] = count
  }, [])

  const goTo = useCallback((idx) => {
    setStepIndex(0)
    setCurrent(idx)
  }, [])

  const next = useCallback(() => {
    const totalSteps = stepCountsRef.current[current] || 0
    if (stepIndex < totalSteps) {
      setStepIndex(prev => prev + 1)
    } else if (current < totalSlides - 1) {
      goTo(current + 1)
    }
  }, [current, stepIndex, totalSlides, goTo])

  const prev = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex(prev => prev - 1)
    } else if (current > 0) {
      goTo(current - 1)
    }
  }, [current, stepIndex, goTo])

  // 키보드 & 클릭 이벤트
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
