// import { useEffect } from 'react';
// import { useAuth } from '../../store/AuthContext';
// import { useNavigate } from 'react-router-dom';
// import kakaoBtn from '../../assets/KakaoLoginButton.svg';
// import googleBtn from '../../assets/GoogleLoginButton.svg';

// export default function LoginPage() {
//   const { user, signInWithKakao, signInWithGoogle } = useAuth();
//   const navigate = useNavigate();

//   useEffect(() => {
//     if (user) {
//       // 1. Supabase 메타데이터 혹은 DB 프로필에서 닉네임 유무 확인
//       const hasNickname = user.user_metadata?.nickname || user.user_metadata?.full_name; 

//       if (hasNickname) {
//         // 이미 정보가 있다면 피드 페이지로
//         navigate('/moragora', { replace: true });
//       } else {
//         // 정보가 없다면 닉네임 설정 페이지로
//         navigate('/auth/nickname', { replace: true });
//       }
//     }
//   }, [user, navigate]);

//   // 로그인 로딩 중이거나 이미 유저가 있어 이동 중일 때는 UI를 보여주지 않음
//   if (user) return null;

//   return (
//     <div className="flex flex-col min-h-screen w-full">
//       {/* 상단 헤더 */}
//       <div className="bg-[#1a2744] px-8 pt-20 pb-14 text-center">
//         <div className="text-5xl mb-3">⚖️</div>
//         <h1 className="text-white text-3xl font-bold">
//           Moragora<span className="text-yellow-400">.</span>
//         </h1>
//         <p className="text-gray-400 text-sm mt-2">AI가 판결하는 논쟁 플랫폼</p>
//       </div>

//       {/* 하단 버튼 영역 */}
//       <div className="flex-1 bg-[#FAFAF5] px-8 py-10 flex flex-col items-center justify-start">
//         <div className="w-full max-w-sm flex flex-col gap-3 py-16">
//           <button
//             onClick={signInWithKakao}
//             className="flex items-center justify-center gap-2 bg-[#FEE500] rounded-lg px-4 py-3 cursor-pointer font-medium text-sm hover:bg-[#F0D900] transition w-full"
//           >
//             <img src={kakaoBtn} alt="카카오" className="h-7 w-7 -m-1 object-contain" />
//             카카오로 시작하기
//           </button>

//           <button
//             onClick={signInWithGoogle}
//             className="flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-3 cursor-pointer text-sm hover:bg-gray-50 transition w-full"
//           >
//             <img src={googleBtn} alt="구글" className="h-5 w-5 object-contain" />
//             구글로 시작하기
//           </button>
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

export default function LoginPage() {
  const { user, signInWithKakao, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const hasNickname = user.user_metadata?.nickname || user.user_metadata?.full_name; 

      if (hasNickname) {
        navigate('/moragora', { replace: true });
      } else {
        navigate('/auth/nickname', { replace: true });
      }
    }
  }, [user, navigate]);

  if (user) return null;

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#FAFAF5]">
      <div className="bg-gradient-to-b from-[#1a2744] to-[#2D3350] px-8 pt-24 pb-16 text-center shadow-lg shrink-0">
        {/* 애니메이션 포인트: 밸런스 이모지에 bounce 효과 적용 */}
        <div className="text-6xl mb-4 inline-block">⚖️</div>
        <h1 className="text-white text-4xl font-black tracking-tighter">
          모라고라<span className="text-yellow-400">.</span>
        </h1>
        <p className="text-white/50 text-sm mt-3 font-medium italic">
          AI가 판결하는 냉철한 논쟁의 장
        </p>
      </div>

      {/* 2. 하단 버튼 영역: 반응형 고려 및 인터랙션 강화 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-10">
        <div className="w-full max-w-[320px] flex flex-col gap-4">
          
          {/* 카카오 버튼: 터치 영역 확대 및 active 효과 */}
          <button
            onClick={signInWithKakao}
            className="flex items-center justify-center gap-3 bg-[#FEE500] rounded-xl px-4 py-4 cursor-pointer font-bold text-[#191919] hover:bg-[#F0D900] active:scale-[0.97] transition-all w-full shadow-sm"
          >
            <img src={kakaoBtn} alt="카카오" className="h-7 w-7 -m-1 object-contain" />
            <span className="text-[15px]">카카오로 시작하기</span>
          </button>

          {/* 구글 버튼: 테두리 디테일 및 폰트 가독성 보정 */}
          <button
            onClick={signInWithGoogle}
            className="flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-4 cursor-pointer font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.97] transition-all w-full shadow-sm"
          >
            <img src={googleBtn} alt="구글" className="h-5 w-5 object-contain" />
            <span className="text-[15px]">구글로 로그인</span>
          </button>
          
          <p className="text-gray-400 text-[11px] text-center mt-4 px-4 leading-tight">
            로그인 시 <Link to="/terms" className="underline text-gray-500">서비스 이용약관</Link> 및 <br/><Link to="/privacy" className="underline text-gray-500">개인정보 처리방침</Link>에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}