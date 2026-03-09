// 담당: 채유진 (프론트B) - 12h
// 상대방 초대 - 링크 복사 + 수락 플로우
// 기능: 논쟁 생성 후 초대 링크 공유(A측) 및 초대 수락(B측)
// 포함 기능: 링크 복사, 카카오톡 공유 SDK 연동, 시스템 공유 시트 연동
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDebateByInviteCode, joinByInvite } from '../../services/api'
import { useAuth } from '../../store/AuthContext'

export default function InvitePage() {
  const { inviteCode } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [debate, setDebate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isCopied, setIsCopied] = useState(false)

  const shareUrl = `${window.location.origin}/invite/${inviteCode}`

  useEffect(() => {
    const fetchInviteInfo = async () => {
      try {
        setLoading(true)
        const response = await getDebateByInviteCode(inviteCode)
        if (response) setDebate(response)
      } catch (err) {
        console.error("초대 정보 로드 실패", err)
      } finally {
        setLoading(false)
      }
    }
    fetchInviteInfo()
  }, [inviteCode])

  const isCreator = true
  // const isCreator = user && debate && String(user.id) === String(debate.creator_id)

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000) // 2초 후 원래대로
  }

  const handleKakaoShare = () => {
    if (!window.Kakao || !window.Kakao.Share) {
      alert('카카오 SDK 로딩 중입니다.')
      return
    }
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: '⚔️ 모라고라 논쟁 초대',
        description: `"${debate?.title || debate?.topic}"\n지금 바로 당신의 반박을 보여주세요!`,
        imageUrl: 'https://moragora.vercel.app/og-image.png',
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [{ title: '논쟁 참여하기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
    })
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '모라고라 논쟁 초대',
          text: `"${debate?.title || debate?.topic}" 논쟁에 당신을 초대합니다!`,
          url: shareUrl,
        })
      } catch (err) { console.log('공유 취소') }
    } else {
      handleCopy()
    }
  }

  const handleAccept = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/invite/${inviteCode}` } });
      return;
    }
    try {
      await joinByInvite(inviteCode);
      const targetId = debate.id || debate._id; 
      if (targetId) navigate(`/debate/${targetId}/argument`); 
    } catch (err) {
      alert(err.message || '참여 처리 중 오류가 발생했습니다.');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
      <div className="animate-pulse text-gray-400 font-bold tracking-widest uppercase">Inviting...</div>
    </div>
  )

  // --- UI 렌더링 (A측: 생성자) ---
  if (isCreator) {
    return (
      <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pb-12">
        {/* 상단 헤더 섹션 */}
        <div className="w-full bg-[#1a2744] text-white pt-16 pb-14 rounded-b-[50px] flex flex-col items-center shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
             <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white rounded-full blur-3xl" />
          </div>
          <div className="text-5xl mb-5 drop-shadow-lg">⚔️</div>
          <h1 className="text-[22px] font-black mb-1 tracking-tight">논쟁 준비 완료!</h1>
          <p className="text-blue-300/70 text-[14px] font-medium tracking-wide">상대방의 반론을 기다려보세요</p>
        </div>

        {/* 논쟁 정보 카드 */}
        <div className="w-[90%] max-w-md bg-white rounded-[28px] p-7 shadow-xl shadow-black/[0.03] border border-gray-100 mt-[-40px] z-10">
          <p className="text-gray-300 text-[11px] font-black mb-3 uppercase tracking-widest">Debate Topic</p>
          <h2 className="text-[18px] font-black text-[#1a2744] mb-4 leading-relaxed break-keep">
            "{debate?.title || debate?.topic}"
          </h2>
          <div className="flex items-center gap-2">
            <span className="bg-gray-50 px-3 py-1.5 rounded-full text-[12px] font-bold text-gray-500 border border-gray-100">
              🎯 {debate?.purpose || debate?.goal}
            </span>
            <span className="bg-gray-50 px-3 py-1.5 rounded-full text-[12px] font-bold text-gray-500 border border-gray-100">
              🔍 {debate?.lens}
            </span>
          </div>
        </div>

        {/* 링크 및 버튼 섹션 */}
        <div className="w-[90%] max-w-md mt-10 px-1 space-y-8">
          <div>
            <label className="block text-[14px] font-black text-[#1a2744] mb-3 ml-1 uppercase tracking-wider opacity-60">Invite Link</label>
            <div className="flex gap-2 bg-white p-2.5 rounded-[22px] border border-gray-200 shadow-sm focus-within:border-[#1a2744]/30 transition-all">
              <input readOnly value={shareUrl} className="flex-1 bg-transparent px-4 text-[13px] text-gray-400 font-medium outline-none truncate" />
              <button 
                onClick={handleCopy} 
                className={`px-6 py-3 rounded-[16px] text-[13px] font-black transition-all transform active:scale-95 cursor-pointer ${
                  isCopied ? 'bg-green-500 text-white' : 'bg-[#1a2744] text-white hover:bg-[#151f36]'
                }`}
              >
                {isCopied ? '완료!' : '복사'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={handleKakaoShare} className="w-full h-[64px] bg-[#FEE500] text-[#3c1e1e] rounded-[24px] font-black text-[17px] shadow-lg shadow-[#FEE500]/20 cursor-pointer active:scale-[0.98] transition-all">카카오톡 초대하기</button>
            <button onClick={handleNativeShare} className="w-full h-[64px] bg-[#1a2744] text-white rounded-[24px] font-black text-[17px] shadow-xl shadow-[#1a2744]/20 cursor-pointer active:scale-[0.98] transition-all">링크로 초대하기</button>
            <button 
              onClick={() => navigate(`/debate/${debate?.id || debate?._id}/argument`)}
              className="w-full h-[64px] bg-white text-[#1a2744] border-2 border-[#1a2744] rounded-[24px] font-black text-[17px] mt-2 hover:bg-gray-50 cursor-pointer active:scale-[0.98] transition-all"
            >
              나도 내 주장 입력하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- UI 렌더링 (B측: 초대받은 자) ---
  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pt-28 p-7">
      <div className="w-full max-w-md bg-white rounded-[36px] shadow-2xl p-9 border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
        {/* 장식용 배경 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#1a2744]/[0.02] rounded-full translate-x-10 -translate-y-10" />
        
        <div className="w-20 h-20 bg-[#1a2744]/5 rounded-[28px] flex items-center justify-center mb-8 text-4xl shadow-inner animate-bounce">✉️</div>
        
        <h1 className="text-[23px] font-black text-[#1a2744] mb-5 leading-tight break-keep">
          "{debate?.title || debate?.topic}"<br/>
          <span className="text-[#1a2744]/60 text-lg font-bold italic">논쟁에 초대받았습니다</span>
        </h1>

        <div className="flex justify-center gap-2 mb-12">
          <span className="bg-[#FAFAF5] px-4 py-2 rounded-full text-[12px] font-black text-gray-400 border border-gray-100">🎯 {debate?.purpose || debate?.goal}</span>
          <span className="bg-[#FAFAF5] px-4 py-2 rounded-full text-[12px] font-black text-gray-400 border border-gray-100">🔍 {debate?.lens}</span>
        </div>

        <button 
          onClick={handleAccept} 
          className="w-full h-[68px] bg-[#1a2744] text-white rounded-[26px] font-black text-[18px] shadow-2xl shadow-[#1a2744]/30 cursor-pointer active:scale-[0.96] transition-all"
        >
          {user ? '논쟁 참여하기' : '로그인하고 참여하기'}
        </button>
        
        <p className="mt-6 text-gray-300 text-[11px] font-medium uppercase tracking-[0.2em]">Moragora AI Court</p>
      </div>
    </div>
  )
}

// 다인논쟁 코드
// import React, { useState, useEffect } from 'react'
// import { useParams, useNavigate } from 'react-router-dom'
// import { getDebateByInviteCode, joinByInvite } from '../../services/api'
// import { useAuth } from '../../store/AuthContext'

// export default function InvitePage() {
//   const { inviteCode } = useParams()
//   const navigate = useNavigate()
//   const { user } = useAuth()

//   const [debate, setDebate] = useState(null)
//   const [loading, setLoading] = useState(true)
//   const [isCopied, setIsCopied] = useState(false)

//   const shareUrl = `${window.location.origin}/invite/${inviteCode}`

//   // 데이터 로드
//   useEffect(() => {
//     const fetchInviteInfo = async () => {
//       try {
//         setLoading(true)
//         const response = await getDebateByInviteCode(inviteCode)
//         if (response) setDebate(response)
//       } catch (err) {
//         console.error("초대 정보 로드 실패", err)
//       } finally {
//         setLoading(false)
//       }
//     }
//     fetchInviteInfo()
//   }, [inviteCode])

//   // --- 논쟁 상태 및 인원 로직 ---
//   const participants = debate?.participants || []
//   const maxParticipants = debate?.max_participants || 4
//   const minParticipants = 2 // 최소 2명부터 시작 가능
  
//   // const isCreator = user && debate && String(user.id) === String(debate.creator_id)
//   const isCreator = true
//   const isAlreadyJoined = user && participants.some(p => String(p.user_id || p.id) === String(user.id))
//   const isFull = participants.length >= maxParticipants
//   const canStart = participants.length >= minParticipants // 시작 버튼 활성화 조건

//   // --- 핸들러 함수들 ---
//   const handleCopy = () => {
//     navigator.clipboard.writeText(shareUrl)
//     setIsCopied(true)
//     setTimeout(() => setIsCopied(false), 2000)
//   }

//   // 카카오톡 공유
//   const handleKakaoShare = () => {
//     if (!window.Kakao || !window.Kakao.Share) {
//       alert('카카오 SDK 로딩 중입니다.')
//       return
//     }
//     window.Kakao.Share.sendDefault({
//       objectType: 'feed',
//       content: {
//         title: '⚔️ 모라고라 논쟁 초대',
//         description: `"${debate?.title || debate?.topic}"\n지금 바로 당신의 반박을 보여주세요!`,
//         imageUrl: 'https://moragora.vercel.app/og-image.png',
//         link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
//       },
//       buttons: [{ title: '논쟁 참여하기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
//     })
//   }

//   // 시스템 공유
//   const handleNativeShare = async () => {
//     if (navigator.share) {
//       try {
//         await navigator.share({
//           title: '모라고라 논쟁 초대',
//           text: `"${debate?.title || debate?.topic}" 논쟁에 당신을 초대합니다!`,
//           url: shareUrl,
//         })
//       } catch (err) { console.log('공유 취소') }
//     } else {
//       handleCopy()
//     }
//   }

//   // [참여자 전용] 초대 수락 핸들러
//   const handleAccept = async () => {
//     if (!user) {
//       alert('로그인이 필요합니다.');
//       navigate('/login', { state: { from: `/invite/${inviteCode}` } });
//       return;
//     }
//     if (isAlreadyJoined) return;

//     try {
//       if (isFull) {
//         alert('이미 정원이 초과되었습니다.');
//         return;
//       }
//       await joinByInvite(inviteCode);
//       // 참여 후 페이지를 새로고침하여 참여자 명단에 본인이 뜨게 함
//       window.location.reload(); 
//     } catch (err) {
//       alert(err.response?.data?.message || '참여 처리 중 오류가 발생했습니다.');
//     }
//   };

//   // [방장 전용] 논쟁 시작 핸들러
//   const handleStartDebate = () => {
//     const targetId = debate.id || debate._id;
//     // 실제 서비스라면 여기서 서버에 'START' 상태 변경 API를 쏴야 합니다.
//     navigate(`/debate/${targetId}/argument`);
//   };

//   if (loading) return (
//     <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
//       <div className="animate-pulse text-gray-400 font-bold tracking-widest uppercase text-xs">Loading Debate...</div>
//     </div>
//   )

//   // --- UI Layout ---
//   return (
//     <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pb-12">
//       {/* 상단 헤더: 현재 참여 현황 강조 */}
//       <div className="w-full bg-[#1a2744] text-white pt-20 pb-16 rounded-b-[50px] flex flex-col items-center shadow-2xl text-center relative overflow-hidden">
//         <div className="text-5xl mb-4">👥</div>
//         <h1 className="text-[20px] font-black mb-1">
//           {isCreator ? "멤버들을 모으고 있습니다" : "논쟁 대기실"}
//         </h1>
//         <p className="text-blue-300/70 text-[13px] font-medium">
//           현재 인원: <span className="text-white font-bold">{participants.length}</span> / {maxParticipants}명
//         </p>
//       </div>

//       {/* 메인 카드 */}
//       <div className="w-[90%] max-w-md bg-white rounded-[32px] p-8 shadow-xl border border-gray-100 mt-[-40px] z-10 flex flex-col">
//         <p className="text-gray-300 text-[10px] font-black mb-2 uppercase tracking-[0.2em] text-center">Debate Topic</p>
//         <h2 className="text-[19px] font-black text-[#1a2744] mb-6 leading-relaxed break-keep text-center">
//           "{debate?.title || debate?.topic}"
//         </h2>

//         {/* 참여자 명단 섹션 */}
//         <div className="grid grid-cols-2 gap-3 mb-8">
//           {[...Array(maxParticipants)].map((_, i) => (
//             <div key={i} className={`flex items-center gap-2 p-3 rounded-2xl border ${participants[i] ? 'bg-blue-50/50 border-blue-100' : 'bg-gray-50 border-dashed border-gray-200'}`}>
//               <div className={`w-2 h-2 rounded-full ${participants[i] ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-300'}`} />
//               <span className={`text-[12px] font-bold ${participants[i] ? 'text-blue-900' : 'text-gray-400'}`}>
//                 {participants[i]?.nickname || `대기 중...`}
//               </span>
//             </div>
//           ))}
//         </div>

//         {/* 하단 액션 버튼 */}
//         <div className="flex flex-col gap-3">
//           {/* 1. 상황별 메인 버튼 */}
//           {isCreator ? (
//             <button 
//               onClick={handleStartDebate}
//               disabled={!canStart}
//               className={`w-full h-[64px] rounded-[22px] font-black text-[17px] transition-all shadow-lg ${
//                 canStart ? 'bg-[#1a2744] text-white active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
//               }`}
//             >
//               {canStart ? '논쟁 시작하기' : `최소 ${minParticipants}명이 필요해요`}
//             </button>
//           ) : !isAlreadyJoined ? (
//             <button 
//               onClick={handleAccept}
//               disabled={isFull}
//               className="w-full h-[64px] bg-[#1a2744] text-white rounded-[22px] font-black text-[17px] shadow-lg active:scale-95 transition-all"
//             >
//               {isFull ? '정원이 가득 찼습니다' : '이 논쟁에 참여하기'}
//             </button>
//           ) : (
//             <div className="w-full h-[64px] bg-blue-50 text-blue-600 rounded-[22px] font-black text-[15px] flex items-center justify-center border border-blue-100">
//               방장이 논쟁을 시작할 때까지 기다려주세요
//             </div>
//           )}

//           {/* 2. 공유 도구 (방장 또는 참여자 모두 가능) */}
//           {(isCreator || isAlreadyJoined) && (
//             <>
//               <div className="h-[1px] bg-gray-100 my-3" />
//               <button onClick={handleKakaoShare} className="w-full h-[56px] bg-[#FEE500] hover:bg-[#f7e227] text-[#3c1e1e] rounded-[18px] font-bold text-[15px] flex items-center justify-center gap-2 cursor-pointer">
//                 카카오톡으로 친구 초대
//               </button>
//               <button onClick={handleNativeShare} className="w-full h-[56px] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-[18px] font-bold text-[15px] flex items-center justify-center gap-2 cursor-pointer">
//                 링크 복사하여 공유
//               </button>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }