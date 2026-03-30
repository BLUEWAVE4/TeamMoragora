import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!user) {
    // 마이페이지에서 로그인 시 홈으로 이동 (다른 페이지는 원래 경로로 복귀)
    const redirectPath = location.pathname === '/profile' ? '/' : location.pathname;
    sessionStorage.setItem('redirectAfterLogin', redirectPath);
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
