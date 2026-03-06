// // 담당: 채유진 (프론트B) - 12h
// // 상대방 초대 - 링크 복사 + 수락 플로우
// // 기능: 논쟁 생성 후 초대 링크 공유(A측) 및 초대 수락(B측)
// // 포함 기능: 링크 복사, 카카오톡 공유 SDK 연동, 시스템 공유 시트 연동
 
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDebateByInviteCode, joinByInvite } from '../../services/api'
import { useAuth } from '../../store/AuthContext'

export default function InvitePage() {
  const { inviteCode } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  //  1. 초기값 null로 변경
  const [debate, setDebate] = useState(null)
  const [loading, setLoading] = useState(true)

  const shareUrl = `${window.location.origin}/invite/${inviteCode || 'abc12345'}`

  useEffect(() => {
    const fetchInviteInfo = async () => {
      try {
        setLoading(true)
        const response = await getDebateByInviteCode(inviteCode)
        if (response) setDebate(response)
      } catch (err) {
        // //  2. 서버 실패 시 홈으로 이동
        // console.error(err)
        // alert('논쟁 정보를 불러올 수 없습니다.')
        // navigate('/')
      } finally {
        setLoading(false)
      }
    }
    fetchInviteInfo()
  }, [inviteCode])

  //  3. isCreator 실제 로직 사용(주석은 프론트 용)
  // const isCreator = true
  const isCreator = user && debate && String(user.id) === String(debate.creator_id)

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    alert('초대 링크가 복사되었습니다!')
  }

  const handleKakaoShare = () => {
    if (!window.Kakao || !window.Kakao.Share) {
      alert('카카오 SDK를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: '⚔️ 모라고라 논쟁 초대',
        description: `"${debate?.title}"\n지금 바로 당신의 반박을 보여주세요!`,
        imageUrl: 'https://moragora.vercel.app/og-image.png',
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        { title: '논쟁 참여하기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }
      ],
    })
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '모라고라 논쟁 초대',
          text: `"${debate?.title}" 논쟁에 당신을 초대합니다!`,
          url: shareUrl,
        })
      } catch (err) { console.log('공유 취소') }
    } else {
      handleCopy()
    }
  }

const handleAccept = async () => {
  // 1. 로그인 여부 확인
  if (!user) {
    navigate('/login', { state: { from: `/invite/${inviteCode}` } });
    return;
  }

  try {
    // 2. 서버에 참여 등록 요청 (inviteCode 사용)
    await joinByInvite(inviteCode);
    alert('참여가 완료되었습니다!');

    // 3. App.jsx의 경로 /debate/:debateId/argument 에 맞게 수정
    // 서버 응답 debate 객체에 id가 있는지, 혹은 _id인지 확인이 필요합니다.
    const targetId = debate.id || debate._id; 
    
    if (targetId) {
      navigate(`/debate/${targetId}/argument`); 
    } else {
      console.error("논쟁 ID를 찾을 수 없습니다.");
      alert("데이터 오류가 발생했습니다.");
    }
    
  } catch (err) {
    // 서버가 404이거나 401(권한없음)인 경우 발생
    alert(err.message || '참여 처리 중 오류가 발생했습니다.');
  }
};

  if (loading) return <div className="p-10 text-center text-gray-400 font-medium">정보 로딩 중...</div>

  // --- UI 렌더링 (A측) ---
  if (isCreator) {
    return (
      <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center">
        <div className="w-full bg-[#1a2744] text-white pt-14 pb-12 rounded-b-[40px] flex flex-col items-center shadow-lg text-center">
          <div className="text-4xl mb-4">⚔️</div>
          <h1 className="text-[20px] font-bold mb-1">논쟁이 생성되었습니다!</h1>
          <p className="text-blue-300/80 text-[13px]">상대방을 초대하세요</p>
        </div>

        <div className="w-[90%] max-w-md bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 mt-6">
          <p className="text-gray-400 text-[11px] font-bold mb-2 uppercase">논쟁 주제</p>
          <h2 className="text-[17px] font-extrabold text-[#1a2744] mb-3 break-keep">
            "{debate?.title}"
          </h2>
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500/80">
            <span>🎯 목적: {debate?.goal}</span>
            <span className="text-gray-200">·</span>
            <span>🔍 렌즈: {debate?.lens}</span>
          </div>
        </div>

        <div className="w-[90%] max-w-md mt-10 px-1">
          <label className="block text-[15px] font-bold text-[#1a2744] mb-3 ml-1 text-left">초대 링크</label>
          <div className="flex gap-2 bg-white p-2.5 rounded-[18px] border border-gray-200 shadow-inner">
            <input readOnly value={shareUrl} className="flex-1 bg-transparent px-3 text-[13px] text-gray-400 outline-none truncate" />
            <button onClick={handleCopy} className="bg-[#1a2744] text-white px-5 py-2.5 rounded-[14px] text-[13px] font-bold cursor-pointer hover:bg-[#151f36]">복사</button>
          </div>

          <div className="flex flex-col gap-3 mt-9">
            <button onClick={handleKakaoShare} className="w-full h-[62px] bg-[#FEE500] text-[#3c1e1e] rounded-[22px] font-bold text-[16px] cursor-pointer hover:bg-[#F0D900]">카카오 공유</button>
            <button onClick={handleNativeShare} className="w-full h-[62px] bg-[#1a2744] text-white rounded-[22px] font-bold text-[16px] shadow-xl shadow-[#1a2744]/20 cursor-pointer hover:bg-[#151f36]">링크 공유</button>
          </div>

          <div className="mt-12 text-center pb-12">
            <p className="text-gray-400 text-[13px]">상대방 수락 시 알림 발송</p>
            <span className="text-orange-500 font-bold text-[12px] bg-orange-50 px-3 py-1 rounded-full mt-2 inline-block">⏰ 24시간 내 미수락 시 자동 취소</span>
          </div>
        </div>
      </div>
    )
  }

  // --- UI 렌더링 (B측) ---
  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pt-24 p-6 text-center">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl p-8 border border-gray-100 flex flex-col items-center">
        <div className="w-16 h-16 bg-[#1a2744]/5 rounded-full flex items-center justify-center mb-6 text-3xl">✉️</div>
        <h1 className="text-2xl font-extrabold text-[#1a2744] mb-4 break-keep px-4">"{debate?.title}"<br/>논쟁에 초대받았습니다</h1>
        <div className="flex justify-center gap-2 mb-10">
          <span className="bg-[#FAFAF5] px-4 py-2 rounded-full text-[12px] font-bold text-gray-500 border border-gray-100">🎯 {debate?.goal}</span>
          <span className="bg-[#FAFAF5] px-4 py-2 rounded-full text-[12px] font-bold text-gray-500 border border-gray-100">🔍 {debate?.lens}</span>
        </div>
        <button onClick={handleAccept} className="w-full h-[60px] bg-[#1a2744] text-white rounded-[22px] font-bold text-[17px] shadow-lg cursor-pointer hover:bg-[#151f36]">
          {user ? '논쟁 참여하기' : '로그인 후 참여하기'}
        </button>
      </div>
    </div>
  )
}

