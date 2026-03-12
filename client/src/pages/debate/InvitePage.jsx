import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDebate, getDebateByInviteCode, joinByInvite } from '../../services/api'
import { useAuth } from '../../store/AuthContext'

const INVITE_TIMEOUT = 300 // 5분

const labelMap = {
  // purpose
  battle: '승부', consensus: '합의', analysis: '분석',
  // lens
  logic: '논리', emotion: '감정', practical: '현실', ethics: '윤리', general: '일반',
  // category
  society: '사회', technology: '기술', politics: '정치', philosophy: '철학',
}
const toKor = (v) => labelMap[v] || v

export default function InvitePage() {
  const { inviteCode } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [debate, setDebate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isOpponentJoined, setIsOpponentJoined] = useState(false)
  const [timeLeft, setTimeLeft] = useState(INVITE_TIMEOUT)
  const [isCreator, setIsCreator] = useState(true) 

  const shareUrl = `${window.location.origin}/invite/${inviteCode}`
  const ogShareUrl = `https://teammoragora.onrender.com/og/invite/${inviteCode}`

  // ── 1. 초대 정보 로드 및 사용자 판별 ──
  useEffect(() => {
    const fetchDebateInfo = async () => {
      try {
        setLoading(true)

        // [A측] 세션에 저장된 캐시 정보가 있는 경우
        const cached = sessionStorage.getItem(`debate_invite_${inviteCode}`)
        if (cached) {
          const parsed = JSON.parse(cached)
          setDebate(parsed)
          setIsCreator(!!user && String(user.id) === String(parsed.creator_id))
          setLoading(false)
          return
        }

        // [비로그인] 일단 참여자(B측) UI를 보여줌
        if (!user) {
          setIsCreator(false)
          setLoading(false)
          return
        }

        // [로그인 상태] 참여 시도 (B측인지 확인)
        try {
          const response = await joinByInvite(inviteCode)
          const targetId = response.id || response._id
          if (targetId) navigate(`/debate/${targetId}/argument`)
        } catch (joinErr) {
          const msg = joinErr.message || ''
          
          if (joinErr.status === 400 && 
            (msg.includes('본인') || msg.includes('자신') || 
            msg.includes('yourself') || msg.includes('own'))) {
            // [A측 판별] 본인이 만든 토론인 경우 정보 조회 후 작성자 UI 표시
            try {
              const debateData = await getDebateByInviteCode(inviteCode)
              setDebate(debateData)
              setIsCreator(true)
              sessionStorage.setItem(`debate_invite_${inviteCode}`, JSON.stringify(debateData))
            } catch (fetchErr) {
              console.error('debate 정보 조회 실패:', fetchErr)
            }
          } else if (msg.includes('이미') || msg.includes('진행')) {
            setError('이미 상대방이 참여한 논쟁입니다.')
            setIsCreator(false)
          } else {
            setError('유효하지 않은 초대 링크입니다.')
            setIsCreator(false)
          }
        }
      } catch (err) {
        console.error("초대 정보 로드 실패", err)
        setError('초대 정보를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (inviteCode) fetchDebateInfo()
  }, [inviteCode, user, navigate])

  // ── 2. [A측 전용] 상대방 입장 폴링 ──
  useEffect(() => {
    if (isCreator !== true || !debate?.id || debate.opponent_id) return

    const interval = setInterval(async () => {
      try {
        const updated = await getDebate(debate.id)
        if (updated?.opponent_id) {
          clearInterval(interval)
          setIsOpponentJoined(true)
          setDebate(updated)
        }
      } catch (err) {
        console.error("상대방 입장 체크 오류:", err)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isCreator, debate?.id, debate?.opponent_id])

  // ── 3. [B측 전용] 5분 타이머 ──
    useEffect(() => {
    if (isCreator !== false) return

    const timer = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        clearInterval(timer)
        // 🔥 타이머 종료 시 자동 이동 추가
        alert('초대 가능 시간이 만료되었습니다.')
        navigate('/')
        return 0
      }
      return prev - 1
    })
  }, 1000)

  return () => clearInterval(timer)
}, [isCreator])

  // ── 4. 이벤트 핸들러 ──
  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec < 10 ? '0' : ''}${sec}`
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleKakaoShare = () => {
    if (!window.Kakao || !window.Kakao.Share) return alert('카카오 SDK 로딩 중...')
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: `⚔️ ${debate?.topic || '모라고라 논쟁 초대'}`,
        description: `${toKor(debate?.category) ? `[${toKor(debate?.category)}] ` : ''}${toKor(debate?.purpose)} 토론에 참여해보세요!`,
        imageUrl: `${window.location.origin}/ogCard2.png`, // 실제 경로 확인 필요
        link: { mobileWebUrl: ogShareUrl, webUrl: ogShareUrl },
      },
      buttons: [{ title: '논쟁 참여하기', link: { mobileWebUrl: ogShareUrl, webUrl: ogShareUrl } }],
    })
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `⚔️ ${debate?.topic || '모라고라 논쟁 초대'}`,
          text: `"${debate?.topic}" 논쟁에 당신을 초대합니다!`,
          url: ogShareUrl,
        })
      } catch (err) { console.log('공유 취소') }
    } else {
      handleCopy()
    }
  }

  // [핵심] 참여 버튼 클릭 핸들러
  const handleAccept = async () => {
    // 1. 비로그인 상태: 로그인 페이지로 유도
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', `/invite/${inviteCode}`);
      const isKakaoApp = /KAKAOTALK/i.test(navigator.userAgent);
     if (isKakaoApp) {
      navigate('/login/kakao'); 
    } else {
      navigate('/login');
    }
    return;
  }
  try {
    const response = await joinByInvite(inviteCode);
    const targetId = response.id || response._id;
    if (targetId) navigate(`/debate/${targetId}/argument`);
  } catch (err) {
    alert(err.message || '참여 처리 중 오류가 발생했습니다.');
  }
};

  // ── 5. 렌더링 조건부 분기 ──
  if (loading) return (
    <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
      <div className="animate-pulse text-gray-400 font-bold tracking-widest uppercase">Inviting...</div>
    </div>
  )

  if (error && !debate) return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center justify-center p-7 text-center">
      <div className="text-5xl mb-6">😅</div>
      <h1 className="text-[20px] font-black text-[#1a2744] mb-3">{error}</h1>
      <button onClick={() => navigate('/')} className="mt-6 px-8 py-3 bg-[#1a2744] text-white rounded-[20px] font-black shadow-lg">홈으로 돌아가기</button>
    </div>
  )

  // [UI - A측] 생성자 화면
  if (isCreator === true) {
    return (
      <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pb-12">
        <div className="w-full bg-[#1a2744] text-white pt-16 pb-14 rounded-b-[50px] flex flex-col items-center shadow-2xl text-center relative overflow-hidden">
          <div className="text-5xl mb-5 drop-shadow-lg">⚔️</div>
          <h1 className="text-[22px] font-black mb-1 tracking-tight">논쟁 준비 완료!</h1>
          <p className="text-blue-300/70 text-[14px] font-medium tracking-wide">상대방의 반론을 기다려보세요</p>
        </div>

        <div className="w-[90%] max-w-md bg-white rounded-[28px] p-7 shadow-xl border border-gray-100 mt-[-40px] z-10">
          <p className="text-gray-300 text-[11px] font-black mb-3 uppercase tracking-widest">Debate Topic</p>
          <h2 className="text-[18px] font-black text-[#1a2744] mb-4 leading-relaxed italic">"{debate?.topic}"</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-gray-50 px-3 py-1.5 rounded-full text-[12px] font-bold text-gray-500 border border-gray-100">🎯 {toKor(debate?.purpose)}</span>
            <span className="bg-gray-50 px-3 py-1.5 rounded-full text-[12px] font-bold text-gray-500 border border-gray-100">🔍 {toKor(debate?.lens)}</span>
          </div>
        </div>

        <div className="w-[90%] max-w-md mt-10 space-y-8 px-1">
          <div>
            <label className="block text-[14px] font-black text-[#1a2744] mb-3 opacity-60 uppercase tracking-wider">Invite Link</label>
            <div className="flex gap-2 bg-white p-2.5 rounded-[22px] border border-gray-200 shadow-sm">
              <input readOnly value={shareUrl} className="flex-1 bg-transparent px-4 text-[13px] text-gray-400 outline-none truncate" />
              <button onClick={handleCopy} className={`px-6 py-3 rounded-[16px] text-[13px] font-black transition-all ${isCopied ? 'bg-green-500 text-white' : 'bg-[#1a2744] text-white active:scale-95'}`}>
                {isCopied ? '완료!' : '복사'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={handleKakaoShare} className="w-full h-[64px] bg-[#FEE500] text-[#3c1e1e] rounded-[24px] font-black text-[17px] shadow-lg active:scale-[0.98] transition-all">카카오톡 초대하기</button>
            <button onClick={handleNativeShare} className="w-full h-[64px] bg-[#1a2744] text-white rounded-[24px] font-black text-[17px] shadow-xl active:scale-[0.98] transition-all">링크로 초대하기</button>
            <button
              onClick={() => isOpponentJoined && navigate(`/debate/${debate?.id}/argument`)}
              disabled={!isOpponentJoined}
              className={`w-full h-[64px] rounded-[24px] font-black text-[17px] transition-all
                ${isOpponentJoined ? 'bg-blue-600 text-white shadow-xl animate-pulse' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              {isOpponentJoined ? '⚔️ 논쟁 시작하기' : '상대방의 입장을 기다리는 중...'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // [UI - B측] 수락자 화면
  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pt-28 p-7">
      <div className="w-full max-w-md bg-white rounded-[36px] shadow-2xl p-9 border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
        {/* 타이머 */}
        <div className={`absolute top-6 right-8 px-3 py-1 rounded-full border ${timeLeft < 60 ? 'bg-red-50 border-red-100 text-red-500' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
          <span className="font-black tabular-nums text-[13px]">{formatTime(timeLeft)}</span>
        </div>

        <div className="w-20 h-20 bg-[#1a2744]/5 rounded-[28px] flex items-center justify-center mb-8 text-4xl animate-bounce">✉️</div>

        <h1 className="text-[23px] font-black text-[#1a2744] mb-5 leading-tight break-keep">
          {debate?.topic && <><span className="italic">"{debate.topic}"</span><br/></>}
          <span className="text-[#1a2744]/60 text-lg font-bold">논쟁에 초대받았습니다</span>
        </h1>

        <div className="flex justify-center gap-2 mb-10">
          <span className="bg-[#FAFAF5] px-4 py-2 rounded-full text-[12px] font-black text-gray-400 border border-gray-100">🎯 {toKor(debate?.purpose)}</span>
          <span className="bg-[#FAFAF5] px-4 py-2 rounded-full text-[12px] font-black text-gray-400 border border-gray-100">🔍 {toKor(debate?.lens)}</span>
        </div>

        <button
          onClick={handleAccept}
          className="w-full h-[68px] bg-[#1a2744] text-white rounded-[26px] font-black text-[18px] shadow-2xl active:scale-[0.96] transition-all"
        >
          {user ? '논쟁 참여하기' : '로그인하고 참여하기'}
        </button>
        <p className="mt-8 text-gray-300 text-[11px] font-medium uppercase tracking-[0.2em]">Moragora AI Court</p>
      </div>
    </div>
  )
}