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
    const url = new URL(window.location.href);
    window.location.href = 
      `intent://${url.host}${url.pathname}${url.search}` +
      `#Intent;scheme=https;package=com.android.chrome;end`;
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
    <div className="relative flex flex-col min-h-screen w-full overflow-hidden bg-[#0e1628]">
 
      {/* ── 배경 레이어 ── */}
      {/* 대각선 라인 패턴 */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            #fff 0px, #fff 1px,
            transparent 1px, transparent 24px
          )`
        }}
      />
      {/* 중앙 방사형 글로우 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(ellipse, #C9950A 0%, transparent 70%)' }}
      />
      {/* 하단 네이비 페이드 */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#0a0f1e] to-transparent" />
 
      {/* ── 상단 헤더 ── */}
      <div className="relative z-10 flex flex-col items-center pt-10 pb-6 px-8 text-center">
        {/* 저울 아이콘 */}
        <div className="mb-6 relative">
          <div className="text-5xl drop-shadow-[0_0_20px_rgba(201,149,10,0.6)]">⚖️</div>
        </div>
 
        {/* 타이틀 */}
        <h1 className="text-white text-[42px] font-black tracking-tighter leading-none mb-2">
          모라고라<span className="text-[#D4A843]">.</span>
        </h1>
        <p className="text-white/30 text-[13px] font-medium tracking-[0.15em] uppercase">
          AI Judge · Debate Court
        </p>
 
        {/* 구분선 */}
        <div className="flex items-center gap-3 mt-4 w-full max-w-[200px]">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#D4A843]/40" />
          <div className="w-1 h-1 rounded-full bg-[#D4A843]/60" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#D4A843]/40" />
        </div>
      </div>
 
      {/* ── 메인 카드 ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-6 pb-10">
        <div className="w-full max-w-[320px] flex flex-col gap-4">
 
          {/* 논쟁 생성 모드 안내 배너 */}
          {isFromDebateCreate && (
            <div className="rounded-2xl overflow-hidden border border-[#D4A843]/30 bg-[#D4A843]/5">
              <div className="bg-[#D4A843]/15 px-4 py-2 border-b border-[#D4A843]/20">
                <span className="text-[#D4A843] text-[10px] font-black uppercase tracking-widest">논쟁 생성 모드</span>
              </div>
              <div className="p-4">
                <p className="text-white/70 text-[12px] leading-relaxed font-medium">
                  로그인 후 작성하던 <span className="text-[#D4A843] font-bold">논쟁 설정 화면</span>으로 즉시 연결됩니다.
                </p>
              </div>
            </div>
          )}
 
          {/* 인앱 브라우저 안내 */}
          {isKakaoTalk ? (
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <p className="text-[12px] text-white/60 font-bold text-center leading-relaxed">
                {isIos ? (
                  <> 아이폰 카카오톡은 <span className="text-[#D4A843]">구글 로그인</span>이 제한됩니다.<br /><span className="underline text-white/40">"브라우저로 열기"</span>를 권장합니다.</>
                ) : (
                  <>카카오톡 환경에서는 <span className="text-[#FEE500] font-black">카카오 로그인</span>이 가장 빠릅니다!</>
                )}
              </p>
            </div>
          ) : isOtherInApp ? (
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-2">
              <p className="text-[12px] text-white/60 font-bold text-center leading-relaxed">
                외부 브라우저(크롬/사파리)에서 접속하시면<br/>
                <span className="text-white/80 underline">구글 로그인</span>을 안전하게 이용하실 수 있습니다.
              </p>
            </div>
          ) : null}
 
          {/* 카카오 버튼 */}
          <button
            onClick={handleKakaoLogin}
            className="flex items-center justify-center gap-3 bg-[#FEE500] rounded-2xl px-4 py-4 font-black text-[#191919] active:scale-[0.97] transition-all w-full shadow-lg shadow-black/30"
          >
            <img src={kakaoBtn} alt="카카오" className="h-8 w-8 -m-2 object-contain" />
            <span className="text-[15px]">카카오로 시작하기</span>
          </button>
 
          {/* 구글 버튼 */}
          {!isKakaoOnly && (
            <button
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 bg-white/8 border border-white/15 rounded-2xl px-4 py-4 font-bold text-white/80 active:scale-[0.97] transition-all w-full shadow-lg shadow-black/20 hover:bg-white/12"
            >
              <img src={googleBtn} alt="구글" className="h-5 w-5 object-contain" />
              <span className="text-[15px]">구글로 로그인</span>
            </button>
          )}
 
          {/* 하단 링크 */}
          <p className="text-white/25 text-[11px] text-center px-4 leading-relaxed">
            로그인 시 <Link to="/terms" className="underline text-white/40">서비스 이용약관</Link> 및{' '}
            <Link to="/privacy" className="underline text-white/40">개인정보 처리방침</Link>에 동의하게 됩니다.
          </p>
        </div>
      </div>
 
    </div>
  );
}