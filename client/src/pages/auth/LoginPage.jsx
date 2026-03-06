import { useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { useNavigate } from 'react-router-dom';
import kakaoBtn from '../../assets/KakaoLoginButton.svg';
import googleBtn from '../../assets/GoogleLoginButton.svg';

export default function LoginPage() {
  const { user, signInWithKakao, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // 1. Supabase 메타데이터 혹은 DB 프로필에서 닉네임 유무 확인
      const hasNickname = user.user_metadata?.nickname || user.user_metadata?.full_name; 

      if (hasNickname) {
        // 이미 정보가 있다면 피드 페이지로
        navigate('/moragora', { replace: true });
      } else {
        // 정보가 없다면 닉네임 설정 페이지로
        navigate('/auth/nickname', { replace: true });
      }
    }
  }, [user, navigate]);

  // 로그인 로딩 중이거나 이미 유저가 있어 이동 중일 때는 UI를 보여주지 않음
  if (user) return null;

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* 상단 헤더 */}
      <div className="bg-[#1a2744] px-8 pt-20 pb-14 text-center">
        <div className="text-5xl mb-3">⚖️</div>
        <h1 className="text-white text-3xl font-bold">
          Moragora<span className="text-yellow-400">.</span>
        </h1>
        <p className="text-gray-400 text-sm mt-2">AI가 판결하는 논쟁 플랫폼</p>
      </div>

      {/* 하단 버튼 영역 */}
      <div className="flex-1 bg-[#FAFAF5] px-8 py-10 flex flex-col items-center justify-start">
        <div className="w-full max-w-sm flex flex-col gap-3 py-16">
          <button
            onClick={signInWithKakao}
            className="flex items-center justify-center gap-2 bg-[#FEE500] rounded-lg px-4 py-3 cursor-pointer font-medium text-sm hover:bg-[#F0D900] transition w-full"
          >
            <img src={kakaoBtn} alt="카카오" className="h-7 w-7 -m-1 object-contain" />
            카카오로 시작하기
          </button>

          <button
            onClick={signInWithGoogle}
            className="flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-3 cursor-pointer text-sm hover:bg-gray-50 transition w-full"
          >
            <img src={googleBtn} alt="구글" className="h-5 w-5 object-contain" />
            구글로 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}