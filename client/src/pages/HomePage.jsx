import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        누가 맞는지,<br />AI가 판결합니다
      </h1>
      <p className="text-lg text-gray-500 mb-8 max-w-md">
        3개 AI 모델이 독립적으로 판결하고, 시민 투표가 더해져 공정한 결론을 만듭니다.
      </p>
      <Link
        to={user ? '/debate/create' : '/login'}
        className="bg-primary-600 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-primary-700 transition"
      >
        논쟁 시작하기
      </Link>
    </div>
  );
}
