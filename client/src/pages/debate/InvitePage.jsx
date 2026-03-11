// 담당: 채유진 (프론트B)
// 상대방 초대 - 링크 복사 + 수락 플로우
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDebate, joinByInvite, getDebateByInviteCode } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

const INVITE_TIMEOUT = 300; // 5분

const LABELS = {
  // 1. 목적 (Purpose)
  battle: '승부',
  consensus: '합의',
  analysis: '분석',

  // 2. 렌즈 (Lens) - 관점
  logic: '논리',
  emotion: '감정',
  practical: '현실',
  ethics: '윤리',
  general: '일반', 

  // 3. 카테고리 (Category) - 주제 분류
  social: '사회',
  technology: '기술',
  politics: '정치',
  philosophy: '철학',
};


export default function InvitePage() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [debate, setDebate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isOpponentJoined, setIsOpponentJoined] = useState(false);
  const [timeLeft, setTimeLeft] = useState(INVITE_TIMEOUT);
  const [isCreator, setIsCreator] = useState(null); 

  const shareUrl = `${window.location.origin}/invite/${inviteCode}`;

  // ── 1. 초대 정보 로드 로직 ──
  useEffect(() => {
    const fetchDebateInfo = async () => {
      try {
        setLoading(true);

        // [A측] 우선 확인: 우주님이 저장한 세션 스토리지 캐시
        const cached = sessionStorage.getItem(`debate_invite_${inviteCode}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setDebate(parsed);
          // 생성자 여부 판별 (API 응답 필드에 따라 creator_id 또는 user_id 확인)
          const creatorId = parsed.creator_id || parsed.user_id;
          setIsCreator(!!user && String(user.id) === String(creatorId));
          setLoading(false);
          return;
        }

        // [B측 또는 캐시 없는 A측] 서버 통신 시도
        if (!user) {
          // 로그인 전이면 일단 참여자(B측) UI를 보여줌
          setIsCreator(false);
          setLoading(false);
          return;
        }

        try {
          const response = await joinByInvite(inviteCode);
          // 성공 시 B측으로 간주 (데이터 구조에 따라 id 또는 debate_id 추출)
          const targetId = response.debate_id || response.id;
          if (targetId) navigate(`/debate/${targetId}/argument`);
        } catch (joinErr) {
          const msg = joinErr.message || '';
          // 본인이 생성한 토론 에러(400) 발생 시 A측으로 확정
          if (msg.includes('본인') || msg.includes('자신') || joinErr.status === 400) {
            setIsCreator(true);
            try {
              // 캐시가 없으므로 서버에서 코드로 상세 정보 재조회
              const detail = await getDebateByInviteCode(inviteCode);
              setDebate(detail);
            } catch {
              setError('논쟁 정보를 불러올 수 없습니다. 다시 생성해 주세요.');
            }
          } else if (msg.includes('이미') || msg.includes('진행')) {
            setError('이미 상대방이 참여한 논쟁입니다.');
            setIsCreator(false);
          } else {
            setError('유효하지 않은 초대 링크입니다.');
            setIsCreator(false);
          }
        }
      } catch (err) {
        console.error("초대 정보 로드 실패", err);
        setError('초대 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (inviteCode) fetchDebateInfo();
  }, [inviteCode, user, navigate]);

  // ── 2. A측 전용 - 상대방 입장 폴링 ──
  useEffect(() => {
    if (isCreator !== true || !debate?.id || debate.opponent_id) return;

    const interval = setInterval(async () => {
      try {
        const updated = await getDebate(debate.id);
        if (updated?.opponent_id) {
          clearInterval(interval);
          setIsOpponentJoined(true);
          setDebate(updated);
        }
      } catch (err) {
        console.error("상대방 입장 체크 오류:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isCreator, debate?.id, debate?.opponent_id]);

  // ── 3. B측 전용 - 5분 타이머 ──
  useEffect(() => {
    if (isCreator !== false) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          alert('초대 시간이 만료되었습니다. 홈으로 이동합니다.');
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCreator, navigate]);

  // ── 헬퍼 함수 ──
  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleKakaoShare = () => {
    if (!window.Kakao || !window.Kakao.Share) return alert('카카오 SDK 로딩 중...');
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: '⚔️ 모라고라 논쟁 초대',
        description: `"${debate?.topic}"\n지금 바로 당신의 반박을 보여주세요!`,
        imageUrl: 'https://moragora.vercel.app/og-image.png',
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [{ title: '논쟁 참여하기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
    });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '모라고라 논쟁 초대',
          text: `"${debate?.topic}" 논쟁에 당신을 초대합니다!`,
          url: shareUrl,
        });
      } catch (err) { console.log('공유 취소'); }
    } else {
      handleCopy();
    }
  };

  const handleAccept = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/invite/${inviteCode}` } });
      return;
    }
    try {
      const response = await joinByInvite(inviteCode);
      const targetId = response.debate_id || response.id;
      if (targetId) navigate(`/debate/${targetId}/argument`);
    } catch (err) {
      alert(err.message || '참여 처리 중 오류가 발생했습니다.');
    }
  };

  // ── 렌더링: 로딩 ──
  if (loading) return (
    <div className="min-h-screen bg-[#FAFAF5] flex items-center justify-center">
      <div className="animate-pulse text-gray-400 font-bold tracking-widest uppercase">Inviting...</div>
    </div>
  );

  // ── 렌더링: 에러 ──
  if (error && !debate) return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center justify-center p-7 text-center">
      <div className="text-5xl mb-6">😅</div>
      <h1 className="text-[20px] font-black text-[#1a2744] mb-3 break-keep">{error}</h1>
      <button onClick={() => navigate('/')} className="mt-6 px-8 py-3 bg-[#1a2744] text-white rounded-[20px] font-black">홈으로</button>
    </div>
  );

  // ── 렌더링: 메인 UI ──
  return (
    <div className="min-h-screen bg-[#FAFAF5] flex flex-col items-center pb-12">
      {isCreator ? (
        // [A측 UI: 생성자 화면]
        <>
          <div className="w-full bg-[#1a2744] text-white pt-16 pb-14 rounded-b-[50px] flex flex-col items-center shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
              <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white rounded-full blur-3xl" />
            </div>
            <div className="text-5xl mb-5 drop-shadow-lg">⚔️</div>
            <h1 className="text-[22px] font-black mb-1 tracking-tight">논쟁 준비 완료!</h1>
            <p className="text-blue-300/70 text-[14px] font-medium tracking-wide">상대방의 반론을 기다려보세요</p>
          </div>

          <div className="w-[90%] max-w-md bg-white rounded-[28px] p-7 shadow-xl border border-gray-100 mt-[-40px] z-10">
            <p className="text-gray-300 text-[11px] font-black mb-3 uppercase tracking-widest">Debate Topic</p>
            <h2 className="text-[18px] font-black text-[#1a2744] mb-4 leading-relaxed break-keep italic">
              "{debate?.topic}"
            </h2>
             <div className="flex flex-wrap gap-2 mb-4">
             {/* 목적 출력 */}
               <span className="...">
               🎯 {LABELS[debate?.purpose] || debate?.purpose || ''}
                </span>
  
                {/* 렌즈 출력 */}
               <span className="...">
              🔍 {LABELS[debate?.lens] || debate?.lens || ''}
              </span>
  
               {/* 카테고리 출력 */}
              <span className="...">
              📁 {LABELS[debate?.category] || debate?.category || ''}
              </span>
             </div>
          </div>

          <div className="w-[90%] max-w-md mt-10 px-1 space-y-8">
            <div>
              <label className="block text-[14px] font-black text-[#1a2744] mb-3 ml-1 uppercase tracking-wider opacity-60">Invite Link</label>
              <div className="flex gap-2 bg-white p-2.5 rounded-[22px] border border-gray-200 shadow-sm">
                <input readOnly value={shareUrl} className="flex-1 bg-transparent px-4 text-[13px] text-gray-400 font-medium outline-none truncate" />
                <button onClick={handleCopy} className={`px-6 py-3 rounded-[16px] text-[13px] font-black transition-all active:scale-95 cursor-pointer ${isCopied ? 'bg-green-500 text-white' : 'bg-[#1a2744] text-white hover:bg-[#151f36]'}`}>
                  {isCopied ? '완료!' : '복사'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={handleKakaoShare} className="w-full h-[64px] bg-[#FEE500] text-[#3c1e1e] rounded-[24px] font-black text-[17px] shadow-lg cursor-pointer active:scale-[0.98] transition-all">카카오톡 초대하기</button>
              <button onClick={handleNativeShare} className="w-full h-[64px] bg-[#1a2744] text-white rounded-[24px] font-black text-[17px] shadow-xl cursor-pointer active:scale-[0.98] transition-all">링크로 초대하기</button>
              <button
                onClick={() => isOpponentJoined && navigate(`/debate/${debate?.id}/argument`)}
                disabled={!isOpponentJoined}
                className={`w-full h-[64px] border-2 rounded-[24px] font-black text-[17px] transition-all px-4
                  ${isOpponentJoined
                    ? 'bg-[#1a2744] text-white border-[#1a2744] shadow-xl cursor-pointer active:scale-[0.98] animate-pulse'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-70'
                  }`}
              >
                {isOpponentJoined ? '⚔️ 논쟁 시작하기' : '상대방의 입장을 기다리는 중...'}
              </button>
            </div>
          </div>
        </>
      ) : (
        // [B측 UI: 참여자 화면]
        <div className="min-h-screen flex flex-col items-center pt-28 p-7 w-full">
          <div className="w-full max-w-md bg-white rounded-[36px] shadow-2xl p-9 border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1a2744]/[0.02] rounded-full translate-x-10 -translate-y-10" />
            <div className="w-20 h-20 bg-[#1a2744]/5 rounded-[28px] flex items-center justify-center mb-8 text-4xl animate-bounce">✉️</div>

            <div className="absolute top-6 right-8 bg-red-50 px-3 py-1 rounded-full border border-red-100">
              <span className="text-red-500 font-black tabular-nums text-[13px]">{formatTime(timeLeft)}</span>
            </div>

            <h1 className="text-[23px] font-black text-[#1a2744] mb-5 leading-tight break-keep">
              {debate?.topic
                ? <><span className="italic">"{debate.topic}"</span><br/></>
                : null
              }
              <span className="text-[#1a2744]/60 text-lg font-bold italic">논쟁에 초대받았습니다</span>
            </h1>

            {debate && (
              <div className="flex justify-center gap-2 mb-10 flex-wrap">
                <span className="bg-[#FAFAF5] px-4 py-2 rounded-full text-[12px] font-black text-gray-400 border border-gray-100">🎯 {LABELS[debate?.purpose] || debate?.purpose || ''}</span>
                <span className="bg-[#FAFAF5] px-4 py-2 rounded-full text-[12px] font-black text-gray-400 border border-gray-100">🔍 {LABELS[debate?.lens] || debate?.lens || ''}</span>
                <span className="bg-[#FAFAF5] px-4 py-2 rounded-full text-[12px] font-black text-gray-400 border border-gray-100">📁 {LABELS[debate?.category] || debate?.category || ''}</span>
              </div>
            )}

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={handleAccept}
                className="w-full h-[68px] bg-[#1a2744] text-white rounded-[26px] font-black text-[18px] shadow-2xl cursor-pointer active:scale-[0.96] transition-all hover:bg-[#151f36]"
              >
                {user ? '논쟁 참여하기' : '로그인하고 참여하기'}
              </button>
            </div>
            <p className="mt-8 text-gray-300 text-[11px] font-medium uppercase tracking-[0.2em]">Moragora AI Court</p>
          </div>
        </div>
      )}
    </div>
  );
}