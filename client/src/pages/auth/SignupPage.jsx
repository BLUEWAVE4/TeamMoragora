import { Navigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

export default function SignupPage() {
  const { user } = useAuth();

  // OAuth 기반이므로 Login과 동일 플로우
  if (user) return <Navigate to="/" replace />;

  return <Navigate to="/login" replace />;
}
