import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://teammoragora.onrender.com'
const socket = io(`${SOCKET_URL}/presentation`, { transports: ['websocket', 'polling'] })

const SLIDE_LABELS = [
  'Title', 'TOC',
  '제안배경', '문제정의', '필요성',
  '해결전략', '서비스구조', '기능시연', '핵심기술', '트러블슈팅',
  '차별점', '기대효과', '팀소개', '감사합니다',
]

export default function RemoteController() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    return () => { socket.off('connect'); socket.off('disconnect') }
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: '#1B2A4A', color: '#e8e0d0',
      display: 'flex', flexDirection: 'column', padding: '1.5rem',
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>프레젠테이션 리모컨</h1>
        <div style={{
          display: 'inline-block', padding: '0.2rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
          background: connected ? 'rgba(16,163,127,0.2)' : 'rgba(239,68,68,0.2)',
          color: connected ? '#10a37f' : '#ef4444',
        }}>
          {connected ? '연결됨' : '연결 중...'}
        </div>
      </div>

      {/* 이전/다음 대형 버튼 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => socket.emit('prev')} style={{
          padding: '2.5rem 1rem', fontSize: '1.3rem', fontWeight: 700,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '16px', color: '#e8e0d0', cursor: 'pointer',
        }}>◀ 이전</button>
        <button onClick={() => socket.emit('next')} style={{
          padding: '2.5rem 1rem', fontSize: '1.3rem', fontWeight: 700,
          background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: '16px', color: '#D4AF37', cursor: 'pointer',
        }}>다음 ▶</button>
      </div>

      {/* 슬라이드 바로가기 */}
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
        슬라이드 바로가기
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', flex: 1 }}>
        {SLIDE_LABELS.map((label, i) => (
          <button key={i} onClick={() => socket.emit('go-to', i)} style={{
            padding: '0.8rem 0.4rem', fontSize: '0.75rem', fontWeight: 600,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', color: '#e8e0d0', cursor: 'pointer',
          }}>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', display: 'block' }}>{String(i + 1).padStart(2, '0')}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
