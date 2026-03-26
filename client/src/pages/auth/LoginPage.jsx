import { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import MoragoraModal from '../../components/common/MoragoraModal';
import useModalState from '../../hooks/useModalState';
import kakaoBtn from '../../assets/KakaoLoginButton.svg';
import googleBtn from '../../assets/GoogleLoginButton.svg';

export default function LoginPage({ isKakaoOnly = false }) {
  const { user, signInWithKakao, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const { modalState, showModal, closeModal } = useModalState();

  const ua = navigator.userAgent.toLowerCase();
  const isKakaoTalk = ua.includes('kakao');
  const isAndroid = ua.includes('android');
  const isIos = /iphone|ipad|ipod/.test(ua);
  
  const isInApp = /kakaotalk|instagram|fbav|fban|fb_iab|messenger|naver|line|bytedancewebview|tiktok|twitter|twttr|telegram|discord|band|daangn|everytime|coupang|baemin|snapchat|pinterest|linkedinapp|micromessenger|slack|zoomwebkit|\bwv\b/i.test(ua);
  
  const isOtherInApp = isInApp && !isKakaoTalk;
  const isFromDebateCreate = sessionStorage.getItem('redirectAfterLogin') === '/debate/create';

  // 1. 카카오 로그인 핸들러
  const handleKakaoLogin = () => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('target') || sessionStorage.getItem('redirectAfterLogin');

    if (target) {
      localStorage.setItem('redirectAfterLogin_backup', target);
    }
    signInWithKakao();
  };

  // 2. 구글 로그인 핸들러
  const handleGoogleLogin = () => {
  if (isAndroid && isInApp) {
      showModal('로그인 중 오류가 발생했습니다', '잠시 후 다시 시도해주세요.');
      
      const url = new URL(window.location.href);
      window.location.href =
        `intent://${url.host}${url.pathname}${url.search}` +
        `#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    }

    if (isIos && isInApp) {
      showModal('외부 브라우저에서 열어주세요', "앱 내부에서는 구글 로그인이 제한됩니다.\n하단 메뉴에서 'Safari로 열기'를 선택해주세요.");
      return;
    }

    signInWithGoogle();
  };

  useEffect(() => {
    if (user) {
      const params = new URLSearchParams(window.location.search);
      const target =
        params.get('target') 
        || sessionStorage.getItem('redirectAfterLogin') 
        || localStorage.getItem('redirectAfterLogin_backup') 
        || '/moragora';

      const hasNickname = user.user_metadata?.nickname || user.user_metadata?.full_name;
      if (!hasNickname) {
        navigate(`/auth/nickname?target=${encodeURIComponent(target)}`, { replace: true });
        return;
      }
      sessionStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('redirectAfterLogin_backup');
      navigate(target, { replace: true });
    }
  }, [user, navigate]);

  if (user) return null;

  return (
    <>
    <div className="relative flex flex-col min-h-screen w-full overflow-hidden bg-[#1a2744]">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 
            `repeating-linear-gradient(
            -45deg,
            #fff 0px, #fff 1px,
            transparent 1px, transparent 24px)`
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(ellipse, #C9950A 0%, transparent 70%)' }}/>
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#0a0f1e] to-transparent" />
      
      <div className="relative z-10 flex flex-col items-center pt-10 pb-6 px-8 text-center">
        <h1 className="text-white text-[42px] font-black tracking-tighter leading-none mb-2">
          모라고라<span className="text-[#D4A843]">.</span>
        </h1>
        <p className="text-white/30 text-[13px] font-medium tracking-[0.15em] uppercase">
          AI 논쟁 · 판결 서비스
        </p>
        <div className="flex items-center gap-3 mt-4 w-full max-w-[200px]">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#D4A843]/40" />
          <div className="w-1 h-1 rounded-full bg-[#D4A843]/60" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#D4A843]/40" />
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center px-6 pb-10">
        <div className="w-full max-w-[320px] flex flex-col gap-4">
          {/* 미 로그인 상태 시 논쟁생성 클릭 안내 */}
          {isFromDebateCreate && (
            <div className="rounded-2xl overflow-hidden border border-[#D4A843]/30 bg-[#D4A843]/5">
              <div className="p-4">
                <p className="text-white/70 text-[12px] leading-relaxed font-medium text-center">
                  로그인 후 <span className="text-[#D4A843] font-bold">논쟁 설정 화면</span>으로 즉시 연결됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 인앱 브라우저별 안내 메시지 */}
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
            className="flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#FEE500]/80 rounded-2xl px-4 py-4 font-black text-[#191919] active:scale-[0.97] transition-all w-full shadow-lg shadow-black/30 cursor-pointer" >
            <img src={kakaoBtn} alt="카카오" className="h-8 w-8 -m-2 object-contain" />
            <span className="text-[15px]">카카오로 로그인</span>
          </button>

          {/* 구글 버튼 */}
          {!isKakaoOnly && (
            <button
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 bg-white/8 border border-white/15 rounded-2xl px-4 py-4 font-bold text-white/70 active:scale-[0.97] transition-all w-full shadow-lg shadow-black/20 hover:bg-white/12 cursor-pointer">
              <img src={googleBtn} alt="구글" className="h-5 w-5 object-contain" />
              <span className="text-[15px]">구글로 로그인</span>
            </button>
          )}

          <p className="text-white/25 text-[11px] text-center px-4 leading-relaxed">
            로그인 시 <Link to="/terms" className="underline text-white/40">서비스 이용약관</Link> 및{' '}
            <Link to="/privacy" className="underline text-white/40">개인정보 처리방침</Link>에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>

      <MoragoraModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.description}
      />
    </>
  );
}