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
    const userAgent = navigator.userAgent.toLowerCase();
    
    // 1. 안드로이드 카카오톡 인앱일 경우 크롬으로 강제 실행 유도
    if (userAgent.includes('kakao') && userAgent.includes('android')) {
      window.location.href = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=http;package=com.android.chrome;end`;
    }

    // 2. 로그인 상태 리다이렉트 로직
    if (user) {
      const hasNickname = user.user_metadata?.nickname || user.user_metadata?.full_name;
      if (!hasNickname) {
        navigate('/auth/nickname', { replace: true });
        return;
      }

      const redirect = sessionStorage.getItem('redirectAfterLogin');
      if (redirect) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirect, { replace: true });
      } else {
        navigate('/moragora', { replace: true });
      }
    }
  }, [user, navigate]);

  if (user) return null;

  // 🔍 환경 감지 변수
  const ua = navigator.userAgent.toLowerCase();
  const isKakaoTalk = ua.includes('kakao');
  const isOtherInApp = /instagram|line|naver|fbav|facebot|messenger/i.test(ua);

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#FAFAF5]">
      {/* 상단 헤더 섹션 */}
      <div className="bg-gradient-to-b from-[#1a2744] to-[#2D3350] px-8 pt-24 pb-16 text-center shadow-lg shrink-0">
        <div className="text-6xl mb-4 font-normal inline-block animate-bounce">⚖️</div>
        <h1 className="text-white text-4xl font-black tracking-tighter">
          모라고라<span className="text-yellow-400">.</span>
        </h1>
        <p className="text-white/50 text-sm mt-3 font-medium italic">
          AI가 판결하는 냉철한 논쟁의 장
        </p>
      </div>

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
        </div>
      </div>
    </div>
  );
}