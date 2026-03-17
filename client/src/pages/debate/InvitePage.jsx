import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDebate, getDebateByInviteCode, joinByInvite, getArguments } from '../../services/api'
import { useAuth } from '../../store/AuthContext'
import { ShieldBan } from 'lucide-react'

const INVITE_TIMEOUT = 300

const labelMap = {
  battle: '승부', consensus: '합의', analysis: '분석',
  logic: '논리', emotion: '감정', practical: '현실', ethics: '윤리', general: '일반',
  society: '사회', technology: '기술', politics: '정치', philosophy: '철학',
  daily: '일상', culture: '문화', sports: '스포츠', entertainment: '연예',
}
const toKor = (v) => labelMap[v] || v

const getDebateRoute = (debateId, status) => {
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

  const shareUrl = `${window.location.origin}/invite/${inviteCode}`

  // ✅ 팀장님 API 응답 기준: debate.creator.nickname
  const creatorNickname = debate?.creator?.nickname || '논쟁 생성자'
  const creatorAvatar = debate?.creator?.avatar_url
    || `https://api.dicebear.com/9.x/avataaars/svg?seed=${debate?.creator?.nickname || 'default'}`

  // ── 1. 초대 정보 로드 ──
  useEffect(() => {
    const fetchDebateInfo = async () => {
      try {
        setLoading(true)
        const debateData = await getDebateByInviteCode(inviteCode)
        setDebate(debateData)
        if (user) {
          const amICreator = String(user.id) === String(debateData.creator_id)
          setIsCreator(amICreator)
          if (amICreator) sessionStorage.setItem(`debate_invite_${inviteCode}`, JSON.stringify(debateData))
        } else {
          setIsCreator(false)
        }
      } catch (err) {
        console.error('초대 정보 로드 실패', err)
        setError('유효하지 않거나 만료된 초대 링크입니다.')
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
          alert('초대 유효 시간이 만료되었습니다.')
          navigate('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isCreator, navigate])

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
    try {
      const response = await joinByInvite(inviteCode)
      const targetId = response.id || response._id
      if (targetId) navigate(getDebateRoute(targetId, response.status))
    } catch (err) {
      const msg = err.message || ''
      if (err.status === 400 || msg.includes('이미') || msg.includes('본인')) {
        navigate(getDebateRoute(debate.id, debate.status))
      } else {
        alert(msg || '참여 처리 중 오류가 발생했습니다.')
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
          description: '논쟁에 참여해주세요!',
          imageUrl: '',
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [{ title: '논쟁 참여하기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
      })
    } else {
      handleCopy()
      alert('카카오톡 공유가 불가하여 링크가 복사되었습니다.')
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
  if (loading || isCreator === null) return (
    <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-[11px] tracking-widest">불러오는 중...</p>
      </div>
    </div>
  )

  // ── 에러 ──
  if (error && !debate) return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center justify-center p-7 text-center">
      <ShieldBan size={48} className="text-[#1B2A4A]/25 mb-5" />
      <h1 className="text-[18px] font-black text-[#1B2A4A] mb-2">{error}</h1>
      <button onClick={() => navigate('/')} className="mt-6 px-8 py-3 bg-[#1B2A4A] text-[#D4AF37] font-black text-[14px] rounded-xl">
        홈으로 돌아가기
      </button>
    </div>
  )

  // ── B측 UI (소환장) ──
  if (isCreator === false) return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center py-10 px-5">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl">

        {/* 헤더 */}
        <div className="bg-[#1B2A4A] pt-8 pb-7 px-6 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-[#D4AF37]/5 rounded-full blur-lg" />
          <div className="relative w-14 h-14 rounded-full border-2 border-[#D4AF37]/60 flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <p className="text-[#D4AF37] text-[12px] font-black tracking-[0.2em] mb-1">모라고라 AI 법정 · 논쟁 소환장</p>
          <span className={`mt-2 px-3 py-1 text-[12px] font-black font-mono rounded-full border ${
            timeLeft < 60
              ? 'bg-red-500/20 border-red-400/40 text-red-300'
              : 'bg-white/10 border-white/20 text-white/50'
          }`}>
            {formatTime(timeLeft)}
          </span>
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
                label: '발신',
                value: creatorNickname  // ✅ debate.creator.nickname
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-4 text-[14px]">
                <span className="text-gray-400 font-medium w-16 shrink-0">{label}</span>
                <span className="text-[#1B2A4A] font-bold">{value}</span>
              </div>
            ))}
            <div className="flex items-center gap-4 text-[14px]">
              <span className="text-gray-400 font-medium w-16 shrink-0">논쟁 유형</span>
              <div className="flex gap-2 flex-wrap">
                {[debate?.purpose, debate?.lens, debate?.category].filter(Boolean).map((v) => (
                  <span key={v} className="bg-[#F5F0E8] border border-[#D4AF37]/30 text-[#8B6914] text-[11px] font-bold px-2.5 py-1 rounded-full">
                    {toKor(v)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 논쟁 주제 */}
          <div className="mx-5 my-5 bg-[#F5F0E8] border-l-4 border-[#D4AF37] px-4 py-4 rounded-r-xl">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">논쟁 주제</p>
            <p className="text-[#1B2A4A] text-[16px] font-black italic leading-snug">
              "{debate?.topic}"
            </p>
          </div>

          {/* A/B측 */}
          {(debate?.pro_side || debate?.con_side) && (
            <div className="px-5 pb-5">
              <div className="grid grid-cols-[1fr_28px_1fr] items-start gap-1">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-black text-emerald-600 tracking-wider mb-1.5">A측</p>
                  <p className="text-[12px] font-bold text-emerald-800 leading-snug">{debate.pro_side || '미정'}</p>
                </div>
                <div className="flex items-center justify-center pt-4">
                  <span className="text-[11px] font-black text-[#D4AF37]">vs</span>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-black text-red-500 tracking-wider mb-1.5">B측</p>
                  <p className="text-[12px] font-bold text-red-800 leading-snug">{debate.con_side || '미정'}</p>
                </div>
              </div>
            </div>
          )}

          {/* 안내 문구 */}
          <div className="px-5 pb-5">
            <p className="text-[13px] text-gray-500 leading-relaxed">
              귀하는 위 논쟁의 <strong className="text-[#1B2A4A]">B측 참여자</strong>로 지정되었습니다.<br/>
              아래 버튼을 통해 출석 의사를 밝혀주시기 바랍니다.
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="bg-[#F5F0E8] px-5 py-4 border-t border-[#1B2A4A]/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-gray-400 font-black tracking-widest">모라고라 AI 법정</span>
            <span className="text-[10px] text-[#8B6914] font-black border border-[#D4AF37]/40 bg-white px-2.5 py-1 rounded-full">
              AI 판결 예정
            </span>
          </div>
          <button
            onClick={handleAccept}
            className="w-full h-[52px] bg-[#1B2A4A] text-[#D4AF37] font-black text-[16px] rounded-xl active:scale-[0.97] transition-all tracking-wide"
          >
            {user ? '출석 · 논쟁 참여하기' : '로그인하고 참여하기'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── A측 UI (대기) ──
  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center py-10 px-5">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl">

        {/* 헤더 */}
        <div className="bg-[#1B2A4A] pt-8 pb-7 px-6 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-[#D4AF37]/5 rounded-full blur-lg" />
          <div className="relative w-14 h-14 rounded-full border-2 border-[#D4AF37]/60 flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <p className="text-white text-[16px] font-black mb-1">논쟁 개시 대기 중</p>
          <p className="text-white/40 text-[13px]">상대방의 출석을 기다리고 있습니다</p>
        </div>

        {/* 바디 */}
        <div className="bg-white">

          {/* 논쟁 주제 */}
          <div className="mx-5 my-5 bg-[#F5F0E8] border-l-4 border-[#D4AF37] px-4 py-4 rounded-r-xl">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">논쟁 주제</p>
            <p className="text-[#1B2A4A] text-[16px] font-black italic leading-snug">
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
              className="w-full h-[52px] bg-[#FEE500] text-[#3c1e1e] font-black text-[15px] rounded-xl active:scale-[0.98] transition-all"
            >
              카카오톡으로 소환장 발송
            </button>
            <button
              onClick={handleNativeShare}
              className="w-full h-[52px] bg-white border-2 border-[#1B2A4A]/15 text-[#1B2A4A] font-black text-[15px] rounded-xl active:scale-[0.98] transition-all"
            >
              링크 복사
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
                ? 'bg-[#1B2A4A] text-[#D4AF37] active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isOpponentJoined && (
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${opponentWriting ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            )}
            <span>
              {opponentWriting ? '상대방이 주장 작성 중...'
                : isOpponentJoined ? '논쟁 시작하기 →'
                : '상대방 출석 대기 중...'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}