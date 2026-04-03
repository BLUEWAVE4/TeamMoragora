import { useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'

// 외부에서 클릭 네비 차단용 플래그
export const navGuard = { skip: false }

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://teammoragora.onrender.com'
const presSocket = io(`${SOCKET_URL}/presentation`, { transports: ['websocket', 'polling'], autoConnect: true })

export function useNavigator(totalSlides) {
  const [current, setCurrent] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const stepCountsRef = useRef({})
  const stateRef = useRef({ current: 0, stepIndex: 0 })

  // ref는 next/prev/goTo에서 수동 동기화

  // 슬라이드별 스텝 수 등록
  const registerSteps = (slideIdx, count) => {
    stepCountsRef.current[slideIdx] = count
  }

  const goTo = useCallback((idx) => {
    stateRef.current.current = idx
    stateRef.current.stepIndex = 0
    setStepIndex(0)
    setCurrent(idx)
  }, [])

  const next = useCallback(() => {
    const cur = stateRef.current.current
    const si = stateRef.current.stepIndex
    const totalSteps = stepCountsRef.current[cur] ?? 0
    if (si < totalSteps) {
      const newSi = si + 1
      stateRef.current.stepIndex = newSi
      setStepIndex(newSi)
    } else if (cur < totalSlides - 1) {
      stateRef.current.current = cur + 1
      stateRef.current.stepIndex = 0
      setStepIndex(0)
      setCurrent(cur + 1)
    }
  }, [totalSlides])

  const prev = useCallback(() => {
    const cur = stateRef.current.current
    const si = stateRef.current.stepIndex
    if (si > 0) {
      const newSi = si - 1
      stateRef.current.stepIndex = newSi
      setStepIndex(newSi)
    } else if (cur > 0) {
      const newCur = cur - 1
      const prevSteps = stepCountsRef.current[newCur] ?? 0
      stateRef.current.current = newCur
      stateRef.current.stepIndex = prevSteps
      setCurrent(newCur)
      setStepIndex(prevSteps)
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
      if (navGuard.skip) { navGuard.skip = false; return }
      if (e.target.closest('a, button, input, iframe, video, [role="button"]')) return
      // 화면 양쪽 가장자리 10%만 클릭 네비게이션
      const edge = window.innerWidth * 0.1
      if (e.clientX <= edge) prev()
      else if (e.clientX >= window.innerWidth - edge) next()
    }

    // 소켓 원격 제어 리스닝
    presSocket.on('next', next)
    presSocket.on('prev', prev)
    presSocket.on('go-to', goTo)

    document.addEventListener('keydown', handleKey)
    document.addEventListener('click', handleClick)
    return () => {
      presSocket.off('next', next)
      presSocket.off('prev', prev)
      presSocket.off('go-to', goTo)
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('click', handleClick)
    }
  }, [next, prev, goTo, totalSlides])

  return { current, total: totalSlides, stepIndex, registerSteps, next, prev, goTo, advanceStep: next }
}
