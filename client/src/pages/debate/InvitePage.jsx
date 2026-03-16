import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDebate, getDebateByInviteCode, joinByInvite } from '../../services/api'
import { useAuth } from '../../store/AuthContext'
import { Target, Tag, Scale, ShieldBan, Gavel, Mail } from 'lucide-react';

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

// 논쟁 상태에 따라 적절한 페이지로 이동
const getDebateRoute = (debateId, status) => {
  switch (status) {
    case 'waiting':
    case 'arguing':
      return `/debate/${debateId}/argument`
    case 'judging':
      return `/debate/${debateId}/judging`
    case 'voting':
      return `/debate/${debateId}/vote`
    case 'completed':
      return `/debate/${debateId}`
    default:
      return `/debate/${debateId}`
  }
}

// ... 상단 import 및 labelMap, getDebateRoute는 동일 ...

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
  const [isCreator, setIsCreator] = useState(null) // null로 시작하여 판별 로직 대기

  const shareUrl = `${window.location.origin}/invite/${inviteCode}`
  const ogShareUrl = `https://teammoragora.onrender.com/og/invite/${inviteCode}`

  // ── 1. 초대 정보 로드 (자동 참여 로직 제거됨) ──
  useEffect(() => {
    const fetchDebateInfo = async () => {
      try {
        setLoading(true)

        // 초대 코드로 논쟁 기본 정보를 먼저 가져옵니다 (참여 X, 조회 O)
        const debateData = await getDebateByInviteCode(inviteCode)
        setDebate(debateData)

        // 로그인 상태라면 내가 만든 토론인지 확인
        if (user) {
          const amICreator = String(user.id) === String(debateData.creator_id)
          setIsCreator(amICreator)
          
          // 만약 작성자라면 정보를 세션에 캐시 (기존 로직 유지)
          if (amICreator) {
            sessionStorage.setItem(`debate_invite_${inviteCode}`, JSON.stringify(debateData))
          }
        } else {
          setIsCreator(false) // 비로그인 시 일단 참여자(B측) UI
        }
      } catch (err) {
        console.error("초대 정보 로드 실패", err)
        setError('유효하지 않거나 만료된 초대 링크입니다.')
      } finally {
        setLoading(false)
      }
    }

    if (inviteCode) fetchDebateInfo()
  }, [inviteCode, user])

  // ── 2. [A측 전용] 상대방 입장 폴링 (동일) ──
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
      } catch (err) { console.error("상대방 입장 체크 오류:", err) }
    }, 3000)
    return () => clearInterval(interval)
  }, [isCreator, debate?.id, debate?.opponent_id])

  // ── 3. [B측 전용] 타이머 (동일) ──
  useEffect(() => {
    if (isCreator !== false) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isCreator])

  // ── 4. 핵심 핸들러: 참여 버튼 클릭 시에만 참여 로직 실행 ──
  const handleAccept = async () => {
    const targetPath = `/invite/${inviteCode}`;

    if (!user) {
      // 비로그인: 경로 저장 후 로그인 유도
      sessionStorage.setItem('redirectAfterLogin', targetPath);
      localStorage.setItem('redirectAfterLogin_backup', targetPath); // iOS 대비 백업

      const isKakaoApp = /KAKAOTALK/i.test(navigator.userAgent);
      const loginBase = isKakaoApp ? '/login/kakao' : '/login';
      navigate(`${loginBase}?target=${encodeURIComponent(targetPath)}`);
      return;
    }

    // 로그인 상태: 유저가 버튼을 클릭했을 때만 joinByInvite 호출
    try {
      const response = await joinByInvite(inviteCode);
      const targetId = response.id || response._id;
      if (targetId) {
        navigate(getDebateRoute(targetId, response.status));
      }
    } catch (err) {
      const msg = err.message || '';
      // 이미 참여 중이거나 본인인 경우 적절한 페이지로 이동
      if (err.status === 400 || msg.includes('이미') || msg.includes('본인')) {
        navigate(getDebateRoute(debate.id, debate.status));
      } else {
        alert(msg || '참여 처리 중 오류가 발생했습니다.');
      }
    }
  };

  // ... formatTime, handleCopy, handleKakaoShare, handleNativeShare 로직 동일 ...

  // ── 5. 렌더링 ──
  if (loading) return (
    <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
      <div className="animate-pulse text-gray-400 font-bold tracking-widest uppercase">Inviting...</div>
    </div>
  )

  if (error && !debate) return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center justify-center p-7 text-center">
      <div className="text-5xl mb-6"><ShieldBan size={60} /></div>
      <h1 className="text-[20px] font-black text-[#1a2744] mb-3">{error}</h1>
      <button onClick={() => navigate('/')} className="mt-6 px-8 py-3 bg-[#1a2744] text-white rounded-[20px] font-black shadow-lg">홈으로 돌아가기</button>
    </div>
  )

  // [UI - A측] 생성자 화면 (동일)
  if (isCreator === true) {
    return (
      <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pb-12">
        <div className="w-full bg-[#1a2744] text-white pt-16 pb-14 rounded-b-[50px] flex flex-col items-center shadow-2xl text-center relative overflow-hidden">
          <div className="text-5xl mb-5 drop-shadow-lg"><Gavel size={50} /></div>
          <h1 className="text-[22px] font-black mb-1 tracking-tight">논쟁 준비 완료!</h1>
          <p className="text-blue-300/70 text-[14px] font-medium tracking-wide">상대방의 반론을 기다려보세요</p>
        </div>

        <div className="w-[90%] max-w-md bg-white rounded-[28px] p-7 shadow-xl border border-gray-100 mt-[-40px] z-10">
          <p className="text-gray-300 text-[11px] font-black mb-3 uppercase tracking-widest">Debate Topic</p>
          <h2 className="text-[18px] font-black text-[#1a2744] mb-4 leading-relaxed italic">"{debate?.topic}"</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-full text-[12px] font-bold text-gray-500 border border-gray-100"><Target size={14} /> {toKor(debate?.purpose)}</span>
            <span className="flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-full text-[12px] font-bold text-gray-500 border border-gray-100"><Scale size={14} /> {toKor(debate?.lens)}</span>
            <span className="flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-full text-[12px] font-bold text-gray-500 border border-gray-100"><Tag size={14} /> {toKor(debate?.category)}</span>
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
              onClick={() => isOpponentJoined && navigate(getDebateRoute(debate?.id, debate?.status))}
              disabled={!isOpponentJoined}
              className={`w-full h-[64px] rounded-[24px] font-black text-[17px] transition-all
                ${isOpponentJoined ? 'bg-blue-600 text-white shadow-xl animate-pulse' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              {isOpponentJoined ? '논쟁 시작하기' : '상대방의 입장을 기다리는 중...'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // [UI - B측] 수락자 화면 (동일)
  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pt-28 p-7">
      <div className="w-full max-w-md bg-white rounded-[36px] shadow-2xl p-9 border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
        <div className={`absolute top-6 right-8 px-3 py-1 rounded-full border ${timeLeft < 60 ? 'bg-red-50 border-red-100 text-red-500' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
          <span className="font-black tabular-nums text-[13px]">{formatTime(timeLeft)}</span>
        </div>
        <div className="w-20 h-20 bg-[#1a2744]/5 rounded-[28px] flex items-center justify-center mb-8 text-4xl animate-bounce"><Mail size={50} /></div>
        <h1 className="text-[23px] font-black text-[#1a2744] mb-5 leading-tight break-keep">
          {debate?.topic && <><span className="italic">"{debate.topic}"</span><br/></>}
          <span className="text-[#1a2744]/60 text-lg font-bold">논쟁에 초대받았습니다</span>
        </h1>
        <div className="flex items-center gap-2 flex-wrap mb-10">
          <span className="flex items-center gap-1 bg-[#FAFAF5] px-4 py-2 rounded-full text-[12px] font-black text-gray-400 border border-gray-100"><Target size={14} /> {toKor(debate?.purpose)}</span>
          <span className="flex items-center gap-1 bg-[#FAFAF5] px-4 py-2 rounded-full text-[12px] font-black text-gray-400 border border-gray-100"><Scale size={14} /> {toKor(debate?.lens)}</span>
          <span className="flex items-center gap-1 bg-[#FAFAF5] px-3 py-2 rounded-full text-[12px] font-black text-gray-500 border border-gray-100"><Tag size={14} /> {toKor(debate?.category)}</span>
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