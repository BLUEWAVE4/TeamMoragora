import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDebate, getDebateByInviteCode, joinByInvite, getArguments } from '../../services/api'
import { useAuth } from '../../store/AuthContext'
import { ShieldBan } from 'lucide-react'
import MoragoraModal from '../../components/common/MoragoraModal'

const INVITE_TIMEOUT = 300

const labelMap = {
  battle: '승부', consensus: '합의', analysis: '분석',
  logic: '논리', emotion: '감정', practical: '현실', ethics: '윤리', general: '일반',
  society: '사회', technology: '기술', politics: '정치', philosophy: '철학',
  daily: '일상', culture: '문화', sports: '스포츠', entertainment: '연예',
}
const toKor = (v) => labelMap[v] || v

const getDebateRoute = (debateId, status) => {
  // 1. 실시간 채팅 모드 우선 처리
  if (mode === 'chat') {
    return `/debate/${debateId}/chat`;
  }
  switch (status) {
    case 'waiting':
    case 'arguing':   return `/debate/${debateId}/argument`
    case 'judging':   return `/debate/${debateId}/judging`
    case 'voting':    return `/debate/${debateId}/vote`
    case 'completed': return `/debate/${debateId}`
    default:          return `/debate/${debateId}`
  }
}

export default function InvitePage() {
  const { inviteCode } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [debate, setDebate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isOpponentJoined, setIsOpponentJoined] = useState(false)
  const [opponentWriting, setOpponentWriting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(INVITE_TIMEOUT)
  const [isCreator, setIsCreator] = useState(null)
  const [modalState, setModalState] = useState({ isOpen: false, title: '', description: '', type: 'info' })
  const showModal = (title, description, type = 'info') => setModalState({ isOpen: true, title, description, type })
  const closeModal = () => setModalState({ isOpen: false, title: '', description: '', type: 'info' })

  const shareOrigin = import.meta.env.VITE_CLIENT_URL || window.location.origin
  const shareUrl = `${shareOrigin}/invite/${inviteCode}`
  const creatorNickname = debate?.creator?.nickname || '논쟁 생성자'

  // ── 1. 초대 정보 로드 + B측 자동 참여 ──
  useEffect(() => {
    const fetchDebateInfo = async () => {
      try {
        setLoading(true)
        const debateData = await getDebateByInviteCode(inviteCode)
        setDebate(debateData)
        if (user) {
          const amICreator = String(user.id) === String(debateData.creator_id)
          setIsCreator(amICreator)
          if (amICreator) {
            sessionStorage.setItem(`debate_invite_${inviteCode}`, JSON.stringify(debateData))
          } else if (debateData.opponent_id === user.id) {
            // B측: 이미 참여한 논쟁 → 현재 상태에 맞는 페이지로 바로 이동
            navigate(getDebateRoute(debateData.id, debateData.status), { replace: true })
            return
          } else {
            // B측: 소환장 UI 표시 (참여 버튼 클릭 시 joinByInvite 실행)
          }
        } else {
          setIsCreator(false)
        }
      } catch (err) {
        console.error('초대 정보 로드 실패', err)
        const msg = err?.message || ''
        if (msg.includes('참여자가 확정')) {
          setError('이미 참여자가 확정된 논쟁입니다.')
        } else {
          setError('유효하지 않거나 만료된 초대 링크입니다.')
        }
      } finally {
        setLoading(false)
      }
    }
    if (inviteCode) fetchDebateInfo()
  }, [inviteCode, user])

  // ── 2. [A측] 폴링 ──
  useEffect(() => {
    if (isCreator !== true || !debate?.id) return
    const interval = setInterval(async () => {
      try {
        const updated = await getDebate(debate.id)
        if (updated?.opponent_id && !isOpponentJoined) {
          setIsOpponentJoined(true)
          setDebate(updated)
        }
        if (updated?.opponent_id && updated?.status === 'arguing') {
          try {
            const args = await getArguments(updated.id)
            if (args?.some(a => a.side === 'B') && !opponentWriting) setOpponentWriting(true)
          } catch (_) {}
        }
      } catch (err) { console.error('폴링 오류:', err) }
    }, 3000)
    return () => clearInterval(interval)
  }, [isCreator, debate?.id, isOpponentJoined, opponentWriting])

  // ── 3. [B측] 타이머 ──
  useEffect(() => {
    if (isCreator !== false) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          showModal('초대 유효 시간이 만료되었습니다', '상대방에게 새 초대 링크를 요청해주세요.', 'error')
          navigate('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isCreator, navigate])

  // ── 4. [B측] 다른 사용자 참여 감지 ──
  useEffect(() => {
    if (isCreator !== false || !debate?.id || !user) return
    if (debate.opponent_id && debate.opponent_id !== user.id) return // 이미 차단됨
    const interval = setInterval(async () => {
      try {
        const updated = await getDebateByInviteCode(inviteCode)
        if (updated.opponent_id && updated.opponent_id !== user.id) {
          clearInterval(interval)
          setError('이미 다른 사용자가 참여한 논쟁입니다.')
        }
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [isCreator, debate?.id, user, inviteCode])

  // ── 핸들러 ──
  const handleAccept = async () => {
    const targetPath = `/invite/${inviteCode}`
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', targetPath)
      localStorage.setItem('redirectAfterLogin_backup', targetPath)
      const isKakaoApp = /KAKAOTALK/i.test(navigator.userAgent)
      navigate(`${isKakaoApp ? '/login/kakao' : '/login'}?target=${encodeURIComponent(targetPath)}`)
      return
    }
    // 이미 자동 참여 완료된 경우 바로 이동
    if (debate?.opponent_id === user.id) {
      navigate(getDebateRoute(debate.id, debate.status))
      return
    }
    try {
      const response = await joinByInvite(inviteCode)
      const targetId = response.id || response._id
      if (targetId) navigate(getDebateRoute(targetId, response.status))
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || ''
      const status = err?.response?.status || err?.status
      if (status === 409 || msg.includes('이미 상대방')) {
        setError('이미 다른 사용자가 참여한 논쟁입니다.')
      } else if (status === 400 && msg.includes('본인')) {
        navigate(getDebateRoute(debate.id, debate.status))
      } else {
        showModal('참여 처리 중 오류가 발생했습니다', '잠시 후 다시 시도해주세요.', 'error')
      }
    }
  }

  const formatTime = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    })
  }

  const handleKakaoShare = () => {
    if (window.Kakao?.Share) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: debate?.topic || '모라고라 논쟁 초대',
          description: `${creatorNickname} 님께서 ${debate?.topic || '모라고라 AI 토론'}(으)로 논쟁을 신청하셨습니다.`,
          imageUrl: 'https://team-moragora-client.vercel.app/ogCard2.png',
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [{ title: '논쟁 참여하기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
      })
    } else {
      handleCopy()
      showModal('링크가 복사되었습니다', '카카오톡 공유가 불가하여\n초대 링크가 클립보드에 복사되었습니다.')
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: debate?.topic || '모라고라 논쟁 초대', url: shareUrl }) }
      catch (_) {}
    } else {
      handleCopy()
    }
  }

  // ── 로딩 ──
  // ── 에러 (자동 홈 리다이렉트) ──
  useEffect(() => {
    if (error && !debate) {
      const timer = setTimeout(() => navigate('/'), 3000)
      return () => clearTimeout(timer)
    }
  }, [error, debate, navigate])

  if (error && !debate) return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center justify-center p-7 text-center">
      <ShieldBan size={48} className="text-[#1B2A4A]/25 mb-5" />
      <h1 className="text-[18px] font-black text-[#1B2A4A] mb-2">{error}</h1>
      <p className="text-[13px] text-gray-400 mt-3">잠시 후 홈으로 이동됩니다.</p>
    </div>
  )

  if (loading || isCreator === null) return (
    <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-[11px] tracking-widest">불러오는 중...</p>
      </div>
    </div>
  )

  // ── B측 UI (소환장) ──
  if (isCreator === false) return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center py-10 px-5">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl">

        {/* 헤더 */}
        <div className="bg-[#1B2A4A] pt-6 pb-7 px-6 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-[#D4AF37]/5 rounded-full blur-lg" />
          {/* 뱃지 */}
<div className="mb-4 relative">
          <div className="absolute inset-0 bg-[#D4AF37]/10 rounded-full blur-2xl scale-150" />
          <div className="relative w-20 h-20 rounded-full border border-[#D4AF37]/30 bg-gradient-to-b from-[#ffffff10] to-transparent p-1.5 shadow-2xl">
            <div className="w-full h-full rounded-full border-2 border-[#D4AF37] flex items-center justify-center bg-[#1B2A4A] shadow-[inner_0_0_15px_rgba(212,175,55,0.2)]">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M9 21H15" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M6 8L12 6L18 8" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M3 14C3 14 3 17 6 17C9 17 9 14 9 14L6 8L3 14Z" fill="#D4AF37" fillOpacity="0.2" stroke="#D4AF37" strokeWidth="1.2"/>
                <path d="M15 14C15 14 15 17 18 17C21 17 21 14 21 14L18 8L15 14Z" fill="#D4AF37" fillOpacity="0.2" stroke="#D4AF37" strokeWidth="1.2"/>
                <circle cx="12" cy="6" r="1" fill="#D4AF37"/>
              </svg>
            </div>
          </div>
        </div>
          <p className="text-white text-[16px] font-black tracking-[0.2em] mb-1">모라고라 · 논쟁 소환장</p>
        </div>

        {/* 바디 */}
        <div className="bg-white">

          {/* 수신/발신/논쟁유형 */}
          <div className="px-6 py-5 border-b border-gray-100 space-y-3">
            {[
              {
                label: '수신인',
                value: user
                  ? `${user.user_metadata?.nickname || user.user_metadata?.full_name || '참여자'} 귀하`
                  : '논쟁 참여자 귀하'
              },
              {
                label: '발신인',
                value: `${creatorNickname} 드림`
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-4 text-[14px]">
                <span className="text-gray-400 font-medium w-16 shrink-0">{label}</span>
                <span className="text-[#1B2A4A] font-bold">{value}</span>
              </div>
            ))}
            <div className="flex items-center gap-4 text-[14px]">
              <span className="text-gray-400 font-medium w-16 shrink-0">논쟁 목적</span>
              <span className="text-[#1B2A4A] font-bold">{toKor(debate?.purpose) || '승부'}</span>
            </div>
          </div>

          {/* 논쟁 주제 */}
          <div className="mx-5 my-5 bg-[#F5F0E8] px-4 py-4 rounded-xl">
            <p className="text-[13px] text-gray-400 font-black uppercase tracking-widest mb-2">논쟁 주제</p>
            <p className="text-[#1B2A4A] text-[16px] font-black leading-snug">
              "{debate?.topic}"
            </p>
          </div>

          {/* A/B측 */}
          {(debate?.pro_side || debate?.con_side) && (
            <div className="px-5 pb-5">
              <div className="grid grid-cols-[1fr_28px_1fr] items-start gap-1">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center opacity-50">
                  <p className="text-[10px] font-black text-gray-400 tracking-wider mb-1.5">A측</p>
                  <p className="text-[12px] font-bold text-gray-500 leading-snug">{debate.pro_side || '미정'}</p>
                  <p className="text-[9px] font-bold border-gray-200 mt-1">상대 입장</p>
                </div>
                <div className="flex items-center justify-center pt-4">
                  <span className="text-[11px] font-black text-[#D4AF37]">vs</span>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-black text-red-500 tracking-wider mb-1.5">B측</p>
                  <p className="text-[12px] font-bold text-red-800 leading-snug">{debate.con_side || '미정'}</p>
                  <p className="text-[9px] font-bold text-red-400 mt-1">내 입장</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 푸터 */}
        <div className="bg-[#F5F0E8] px-5 py-4 border-t border-[#1B2A4A]/10">
          <button
            onClick={handleAccept}
            className="w-full h-[52px] bg-[#1B2A4A] text-[#D4AF37] font-black text-[16px] rounded-xl active:scale-[0.97] transition-all tracking-wide cursor-pointer"
          >
            {user ? '출석 · 논쟁 참여하기' : '로그인하고 참여하기'}
          </button>
        </div>
      </div>
      <MoragoraModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.description}
        type={modalState.type}
      />
    </div>
  )

  // ── A측 UI (대기) ──
  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center py-10 px-5">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl">

        {/* 헤더 */}
        <div className="bg-[#1B2A4A] py-8 px-6 flex items-center justify-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-[#D4AF37]/5 rounded-full blur-lg" />
          <div className="relative">
            <div className="absolute inset-0 bg-[#D4AF37]/10 rounded-full blur-2xl scale-150" />
            <div className="relative w-[76px] h-[76px] rounded-full border border-[#D4AF37]/30 bg-gradient-to-b from-[#ffffff10] to-transparent p-1.5">
              <div className="w-full h-full rounded-full border-2 border-[#D4AF37] flex items-center justify-center bg-[#1B2A4A]">
                <svg width="37" height="37" viewBox="0 2 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M9 21H15" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M6 8L12 6L18 8" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M3 14C3 14 3 17 6 17C9 17 9 14 9 14L6 8L3 14Z" fill="#D4AF37" fillOpacity="0.2" stroke="#D4AF37" strokeWidth="1.2"/>
                  <path d="M15 14C15 14 15 17 18 17C21 17 21 14 21 14L18 8L15 14Z" fill="#D4AF37" fillOpacity="0.2" stroke="#D4AF37" strokeWidth="1.2"/>
                  <circle cx="12" cy="6" r="1" fill="#D4AF37"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 바디 */}
        <div className="bg-white">

          {/* 논쟁 주제 */}
          <div className="mx-5 my-5 bg-[#F5F0E8] px-4 py-4 rounded-xl">
            <p className="text-[13px] text-gray-400 font-black uppercase tracking-widest mb-2">논쟁 주제</p>
            <p className="text-[#1B2A4A] text-[16px] font-black leading-snug">
              "{debate?.topic}"
            </p>
          </div>

          {/* 초대 링크 */}
          <div className="px-5 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-gray-400 font-medium w-16 shrink-0">초대 링크</span>
              <span className="text-[12px] text-gray-400 font-mono truncate">{shareUrl}</span>
            </div>
          </div>

          {/* 공유 버튼 */}
          <div className="px-5 pb-5 flex flex-col gap-3">
            <button
              onClick={handleKakaoShare}
              className="w-full h-[52px] bg-[#FEE500] text-[#3c1e1e] font-black text-[15px] rounded-xl active:scale-[0.98] transition-all cursor-pointer"
            >
              카카오톡으로 소환장 발송
            </button>
            <button
              onClick={handleCopy}
              className={`w-full h-[52px] bg-white border-2 border-[#1B2A4A]/15 font-black text-[15px] rounded-xl active:scale-[0.98] transition-all cursor-pointer ${isCopied ? 'text-[#D4AF37]' : 'text-[#1B2A4A]'}`}
            >
              {isCopied ? '복사 완료!' : '링크 복사'}
            </button>
          </div>
        </div>

        {/* 푸터 - 상태 버튼 */}
        <div className="bg-[#F5F0E8] px-5 py-4 border-t border-[#1B2A4A]/10">
<button
  onClick={() => isOpponentJoined && navigate(getDebateRoute(debate?.id, debate?.status))}
  disabled={!isOpponentJoined}
  className={`w-full h-[52px] font-black text-[15px] rounded-xl transition-all duration-500 flex items-center justify-center gap-2 ${
    isOpponentJoined
      ? 'bg-[#1B2A4A] text-[#D4AF37] active:scale-[0.98] cursor-pointer shadow-lg' 
      : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
  }`}
>
  <span>
    {opponentWriting 
      ? '상대방이 주장 작성 중...'
      : isOpponentJoined 
        ? '논쟁 시작하기'
        : '상대방 출석 대기 중...'}
  </span>
</button>
        </div>
      </div>
      <MoragoraModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.description}
        type={modalState.type}
      />
    </div>
  )
}