// import { useEffect } from 'react';
// import { useAuth } from '../../store/AuthContext';
// import { useNavigate, Link } from 'react-router-dom';
// import kakaoBtn from '../../assets/KakaoLoginButton.svg';
// import googleBtn from '../../assets/GoogleLoginButton.svg';

// export default function LoginPage() {
//   const { user, signInWithKakao, signInWithGoogle } = useAuth();
//   const navigate = useNavigate();

//   useEffect(() => {
//     if (user) {
//       const hasNickname = user.user_metadata?.nickname || user.user_metadata?.full_name;

//       if (!hasNickname) {
//         navigate('/auth/nickname', { replace: true });
//         return;
//       }

//       // 로그인 전 저장된 경로가 있으면 그곳으로 이동
//       const redirect = sessionStorage.getItem('redirectAfterLogin');
//       if (redirect) {
//         sessionStorage.removeItem('redirectAfterLogin');
//         navigate(redirect, { replace: true });
//       } else {
//         navigate('/moragora', { replace: true });
//       }
//     }
//   }, [user, navigate]);

//   if (user) return null;

//   return (
//     <div className="flex flex-col min-h-screen w-full bg-[#FAFAF5]">
//       <div className="bg-gradient-to-b from-[#1a2744] to-[#2D3350] px-8 pt-24 pb-16 text-center shadow-lg shrink-0">
//         {/* 애니메이션 포인트: 밸런스 이모지에 bounce 효과 적용 */}
//         <div className="text-6xl mb-4 inline-block">⚖️</div>
//         <h1 className="text-white text-4xl font-black tracking-tighter">
//           모라고라<span className="text-yellow-400">.</span>
//         </h1>
//         <p className="text-white/50 text-sm mt-3 font-medium italic">
//           AI가 판결하는 냉철한 논쟁의 장
//         </p>
//       </div>

//       {/* 2. 하단 버튼 영역: 반응형 고려 및 인터랙션 강화 */}
//       <div className="flex-1 flex flex-col items-center justify-center px-8 pb-10">
//         <div className="w-full max-w-[320px] flex flex-col gap-4">
          
//           {/* 카카오 버튼: 터치 영역 확대 및 active 효과 */}
//           <button
//             onClick={signInWithKakao}
//             className="flex items-center justify-center gap-3 bg-[#FEE500] rounded-xl px-4 py-4 cursor-pointer font-bold text-[#191919] hover:bg-[#F0D900] active:scale-[0.97] transition-all w-full shadow-sm"
//           >
//             <img src={kakaoBtn} alt="카카오" className="h-7 w-7 -m-1 object-contain" />
//             <span className="text-[15px]">카카오로 시작하기</span>
//           </button>

//           {/* 구글 버튼: 테두리 디테일 및 폰트 가독성 보정 */}
//           <button
//             onClick={signInWithGoogle}
//             className="flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-4 cursor-pointer font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.97] transition-all w-full shadow-sm"
//           >
//             <img src={googleBtn} alt="구글" className="h-5 w-5 object-contain" />
//             <span className="text-[15px]">구글로 로그인</span>
//           </button>
          
//           <p className="text-gray-400 text-[11px] text-center mt-4 px-4 leading-tight">
//             로그인 시 <Link to="/terms" className="underline text-gray-500">서비스 이용약관</Link> 및 <br/><Link to="/privacy" className="underline text-gray-500">개인정보 처리방침</Link>에 동의하게 됩니다.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }
import { useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import kakaoBtn from '../../assets/KakaoLoginButton.svg';
import googleBtn from '../../assets/GoogleLoginButton.svg';

export default function LoginPage({ isKakaoOnly = false }) { 
  const { user, signInWithKakao, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // 리다이렉트 여부 상태 확인
  const isFromDebateCreate = sessionStorage.getItem('redirectAfterLogin') === '/debate/create';

  useEffect(() => {
<<<<<<< HEAD
    // 사용자가 로그인된 상태라면 리다이렉트 로직 수행
=======
    const userAgent = navigator.userAgent.toLowerCase();
    
    // 1. 안드로이드 카카오톡 인앱일 경우 크롬으로 강제 실행 유도
    if (userAgent.includes('kakao') && userAgent.includes('android')) {
      window.location.href = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=http;package=com.android.chrome;end`;
    }

    // 2. 로그인 상태 리다이렉트 로직
>>>>>>> origin/develop
    if (user) {
      // 1. 닉네임 설정 여부 확인
      const hasNickname = user.user_metadata?.nickname || user.user_metadata?.full_name;
      if (!hasNickname) {
        navigate('/auth/nickname', { replace: true });
        return;
      }

<<<<<<< HEAD
      // 2. 저장된 리다이렉트 경로가 있는지 확인
=======
>>>>>>> origin/develop
      const redirect = sessionStorage.getItem('redirectAfterLogin');
      
      if (redirect) {
        // 경로를 사용한 후에는 세션에서 삭제하여 중복 리다이렉트 방지
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirect, { replace: true });
      } else {
        // 기본 페이지로 이동
        navigate('/moragora', { replace: true });
      }
    }
  }, [user, navigate]);

  // 로그인 진행 중에는 화면을 렌더링하지 않음
  if (user) return null;

  // 🔍 환경 감지 변수
  const ua = navigator.userAgent.toLowerCase();
  const isKakaoTalk = ua.includes('kakao');
  const isOtherInApp = /instagram|line|naver|fbav|facebot|messenger/i.test(ua);

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#FAFAF5]">
      {/* 상단 헤더 섹션 */}
      <div className="bg-gradient-to-b from-[#1a2744] to-[#2D3350] px-8 pt-24 pb-16 text-center shadow-lg shrink-0">
<<<<<<< HEAD
        <div className="text-6xl mb-4 inline-block animate-bounce">⚖️</div>
=======
        <div className="text-6xl mb-4 font-normal inline-block animate-bounce">⚖️</div>
>>>>>>> origin/develop
        <h1 className="text-white text-4xl font-black tracking-tighter">
          모라고라<span className="text-yellow-400">.</span>
        </h1>
        <p className="text-white/50 text-sm mt-3 font-medium italic">
          AI가 판결하는 냉철한 논쟁의 장
        </p>
      </div>

<<<<<<< HEAD
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-10">
        <div className="w-full max-w-[320px] flex flex-col gap-4">
          
          {/* 카카오톡 인앱 브라우저 대응 안내 */}
          {isKakaoOnly && (
            <div className="text-center mb-2">
              <p className="text-[13px] text-blue-900 font-bold bg-blue-50 py-2 rounded-lg">
                카카오톡 전용 로그인 페이지입니다
              </p>
            </div>
          )}

          {/* 카카오 로그인 버튼 */}
          <button
            onClick={signInWithKakao}
            className="flex items-center justify-center gap-3 bg-[#FEE500] rounded-xl px-4 py-4 cursor-pointer font-bold text-[#191919] hover:bg-[#F0D900] active:scale-[0.97] transition-all w-full shadow-sm"
          >
            <img src={kakaoBtn} alt="카카오" className="h-7 w-7 -m-1 object-contain" />
            <span className="text-[15px]">카카오로 시작하기</span>
          </button>

          {/* 일반 환경에서만 구글 로그인 노출 (인앱 브라우저 차단 방지) */}
          {!isKakaoOnly && (
            <button
              onClick={signInWithGoogle}
              className="flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-4 cursor-pointer font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.97] transition-all w-full shadow-sm"
            >
              <img src={googleBtn} alt="구글" className="h-5 w-5 object-contain" />
              <span className="text-[15px]">구글로 로그인</span>
            </button>
          )}
          
          <p className="text-gray-400 text-[11px] text-center mt-4 px-4 leading-tight">
            로그인 시 <Link to="/terms" className="underline text-gray-500">서비스 이용약관</Link> 및 <br/>
            <Link to="/privacy" className="underline text-gray-500">개인정보 처리방침</Link>에 동의하게 됩니다.
          </p>
=======
      <div className="flex-1 flex flex-col items-center justify-start px-8 pt-10 pb-10">
        <div className="w-full max-w-[320px] flex flex-col">
          
          {/* 🟢 안내 섹션 고정 영역 (h-[140px]) */}
          <div className="h-[140px] flex items-end mb-6"> 
            {isFromDebateCreate ? (
              <div className="w-full overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/50 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-[#1a2744] px-4 py-2 flex items-center gap-2">
                  <span className="text-white text-[10px] font-black uppercase tracking-widest">논쟁 생성 모드</span>
                </div>
                <div className="p-4">
                  <h3 className="text-[#1a2744] font-bold text-sm mb-1">논쟁 생성 페이지로 이동</h3>
                  <p className="text-gray-500 text-[12px] leading-relaxed font-medium">
                    로그인을 완료하시면 작성하시려던 <br/>
                    <span className="text-blue-600 font-bold">논쟁 설정 화면</span>으로 즉시 연결됩니다.
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full" /> 
            )}
          </div>

          {/* 로그인 버튼 섹션 */}
          <div className="flex flex-col gap-4">
            
            {/* 🔵 안내 문구 최적화 (중복 방지) */}
            {(isKakaoOnly || isKakaoTalk) ? (
              <div className="text-center mb-1">
                <p className="text-[13px] text-blue-900 font-bold bg-blue-50 py-2 rounded-lg border border-blue-100 shadow-sm">
                  카카오톡 전용 로그인 페이지입니다
                </p>
              </div>
            ) : isOtherInApp ? (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl animate-pulse shadow-sm">
                <p className="text-[11px] text-amber-800 font-bold text-center leading-tight">
                  ⚠️ 현재 브라우저에서는 구글 로그인이 안 될 수 있습니다.<br/>
                  가급적 크롬(Chrome)이나 사파리(Safari)를 권장합니다.
                </p>
              </div>
            ) : null}

            {/* 카카오 로그인 버튼 */}
            <button
              onClick={signInWithKakao}
              className="flex items-center justify-center gap-3 bg-[#FEE500] rounded-xl px-4 py-4 cursor-pointer font-bold text-[#191919] hover:bg-[#F0D900] active:scale-[0.97] transition-all w-full shadow-sm"
            >
              <img src={kakaoBtn} alt="카카오" className="h-7 w-7 -m-1 object-contain" />
              <span className="text-[15px]">카카오로 시작하기</span>
            </button>

            {/* ⚪ 구글 버튼: 카톡이 아닐 때만 노출 */}
            {!isKakaoOnly && !isKakaoTalk && (
              <button
                onClick={signInWithGoogle}
                className="flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-4 cursor-pointer font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.97] transition-all w-full shadow-sm"
              >
                <img src={googleBtn} alt="구글" className="h-5 w-5 object-contain" />
                <span className="text-[15px]">구글로 로그인</span>
              </button>
            )}
            
            <p className="text-gray-400 text-[11px] text-center mt-4 px-4 leading-tight">
              로그인 시 <Link to="/terms" className="underline text-gray-500">서비스 이용약관</Link> 및 <br/>
              <Link to="/privacy" className="underline text-gray-500">개인정보 처리방침</Link>에 동의하게 됩니다.
            </p>
          </div>
>>>>>>> origin/develop
        </div>
      </div>
    </div>
  );
}