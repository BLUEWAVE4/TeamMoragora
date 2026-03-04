import { useAuth } from '../../store/AuthContext';
import { Navigate } from 'react-router-dom';

export default function LoginPage() {
  const { user, signInWithKakao, signInWithGoogle } = useAuth();

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-2xl font-bold mb-8">로그인</h2>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={signInWithKakao}
          className="w-full py-3 rounded-lg font-semibold bg-yellow-400 text-yellow-900 hover:bg-yellow-500 transition"
        >
          카카오로 시작하기
        </button>
        <button
          onClick={signInWithGoogle}
          className="w-full py-3 rounded-lg font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
        >
          Google로 시작하기
        </button>
      </div>
    </div>
  );
}
