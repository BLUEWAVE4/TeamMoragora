import { useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import kakaoBtn from '../../assets/KakaoLoginButton.svg';
import googleBtn from '../../assets/GoogleLoginButton.svg';

export default function LoginPage({ isKakaoOnly = false }) {
  const { user, signInWithKakao, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // 환경 판별 변수들
  const ua = navigator.userAgent.toLowerCase();
  const isKakaoTalk = ua.includes('kakao');
  const isAndroid = ua.includes('android');
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isOtherInApp = /instagram|line|naver|fbav|facebot|messenger/i.test(ua);

  // 리다이렉트 여부 상태 확인 (UI 안내용)
  const isFromDebateCreate = sessionStorage.getItem('redirectAfterLogin') === '/debate/create';

  // [1] 카카오톡 로그인 핸들러: iOS 세션 유실 대비 백업
  const handleKakaoLogin = () => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('target') || sessionStorage.getItem('redirectAfterLogin');
    
    if (target) {
      // iOS는 앱 인증 후 돌아오면 세션이 날아갈 수 있으므로 로컬스토리지에 저장
      localStorage.setItem('redirectAfterLogin_backup', target);
    }
    signInWithKakao();
  };

  // [2] 구글 로그인 핸들러: 안드로이드 카톡 탈출 로직
  const handleGoogleLogin = () => {
    if (isKakaoTalk && isAndroid) {
      const currentFullUrl = window.location.href; 
      window.location.href = `intent://${currentFullUrl.replace(/^https?:\/\//, '')}#Intent;scheme=http;package=com.android.chrome;end`;
    } else if (isKakaoTalk && isIos) {
      alert("아이폰 카카오톡 내에서는 구글 로그인이 차단될 수 있습니다. 오른쪽 아래 '...' 버튼을 눌러 'Safari로 열기'를 해주세요!");
    } else {
      signInWithGoogle();
    }
  };

  // [3] 로그인 성공 후 리다이렉트 처리
  useEffect(() => {
    if (user) {
      // 1. 목적지 결정 우선순위: URL 쿼리 > 세션스토리지 > 로컬스토리지(백업)
      const params = new URLSearchParams(window.location.search);
      const target = 
        params.get('target') || 
        sessionStorage.getItem('redirectAfterLogin') || 
        localStorage.getItem('redirectAfterLogin_backup') || 
        '/moragora';

      // 2. 닉네임 설정 여부 확인
      const hasNickname = user.user_metadata?.nickname || user.user_metadata?.full_name;
      if (!hasNickname) {
        // 닉네임 정하러 갈 때도 target을 잊지 않게 전달
        navigate(`/auth/nickname?target=${encodeURIComponent(target)}`, { replace: true });
        return;
      }

      // 3. 목적지 확인 후 이동 및 저장소 청소
      sessionStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('redirectAfterLogin_backup');
      navigate(target, { replace: true });
    }
  }, [user, navigate]);

  if (user) return null;

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#FDFDFD]">
      {/* 상단 헤더 섹션 */}
      <div className="bg-gradient-to-b from-[#1a2744] to-[#2D3350] px-8 pt-24 pb-16 text-center shadow-lg shrink-0">
        <div className="text-6xl mb-4 font-normal inline-block animate-bounce">"로고 영역"</div>
        <h1 className="text-white text-4xl font-black tracking-tighter">
          모라고라<span className="text-yellow-400">.</span>
        </h1>
        <p className="text-white/50 text-sm mt-3 font-medium italic">AI가 판결하는 냉철한 논쟁의 장</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-8 pt-10 pb-10">
        <div className="w-full max-w-[320px] flex flex-col">
          {/* 안내 섹션 */}
          <div className="h-[140px] flex items-end mb-6">
            {isFromDebateCreate && (
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
            )}
          </div>

          <div className="flex flex-col gap-4">
            {/* 인앱 브라우저 상황별 커스텀 안내 */}
            {isKakaoTalk ? (
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm mb-2">
                <p className="text-[12px] text-blue-900 font-bold text-center leading-relaxed">
                  {isIos ? (
                    <> 아이폰 카카오톡은 <span className="text-blue-600 font-black">구글 로그인</span>이 제한됩니다.<br /><span className="underline">"브라우저로 열기"</span>를 권장합니다.</>
                  ) : (
                    <>카카오톡 환경에서는 <span className="text-yellow-600 font-black">카카오 로그인</span>이 가장 빠릅니다!</>
                  )}
                </p>
              </div>
            ) : isOtherInApp ? (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm mb-2">
                <p className="text-[12px] text-amber-800 font-bold text-center leading-relaxed">
                    외부 브라우저(크롬/사파리)에서 접속하시면<br/>
                  <span className="underline italic">구글 로그인</span>을 안전하게 이용하실 수 있습니다.
                </p>
              </div>
            ) : null}

            {/* 카카오 버튼 */}
            <button
              onClick={handleKakaoLogin}
              className="flex items-center justify-center gap-3 bg-[#FEE500] rounded-xl px-4 py-4 cursor-pointer font-bold text-[#191919] hover:bg-[#F0D900] active:scale-[0.97] transition-all w-full shadow-sm"
            >
              <img src={kakaoBtn} alt="카카오" className="h-7 w-7 -m-1 object-contain" />
              <span className="text-[15px]">카카오로 시작하기</span>
            </button>

            {/* 구글 버튼 */}
            {!isKakaoOnly && (
              <button
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-4 cursor-pointer font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.97] transition-all w-full shadow-sm"
              >
                <img src={googleBtn} alt="구글" className="h-5 w-5 object-contain" />
                <span className="text-[15px]">구글로 로그인</span>
              </button>
            )}

            {/* 하단 링크 */}
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