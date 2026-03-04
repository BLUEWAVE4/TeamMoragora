import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary-600">
          모라고라
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link to="/moragora" className="text-gray-600 hover:text-primary-600">
            모라고라
          </Link>
          <Link to="/ranking" className="text-gray-600 hover:text-primary-600">
            랭킹
          </Link>
          {user ? (
            <>
              <Link to="/debate/create" className="bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700">
                논쟁 시작
              </Link>
              <Link to="/profile" className="text-gray-600 hover:text-primary-600">
                마이페이지
              </Link>
              <button onClick={signOut} className="text-gray-400 hover:text-gray-600">
                로그아웃
              </button>
            </>
          ) : (
            <Link to="/login" className="bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700">
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
