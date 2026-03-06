import { Link, useLocation } from 'react-router-dom' 
import { useAuth } from '../../store/AuthContext'

export default function Header() {
  const { user, signOut } = useAuth()
  const location = useLocation() 

  const isAuthPage = location.pathname === '/login' 
  const isProtectedRouteArea = 
    location.pathname.startsWith('/debate') || 
    location.pathname.includes('/auth/nickname') ||
    location.pathname.startsWith('/profile');

  const shouldHideNav = isAuthPage || isProtectedRouteArea

  return (
    <header className="sticky top-0 z-100 flex items-center justify-between h-[var(--gnb-h)] px-5 bg-bg/85 backdrop-blur-xl border-b border-primary/6">
      <Link to="/" className="text-[22px] font-extrabold text-primary tracking-tight">
        모라<span className="text-gold">고라</span>
      </Link>

      {!shouldHideNav && (
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/debate/create" className="w-9 h-9 rounded-full flex items-center justify-center bg-surface text-primary/60 text-lg hover:bg-primary hover:text-white transition">
                +
              </Link>
              <Link to="/profile" className="w-9 h-9 rounded-full flex items-center justify-center bg-surface text-primary/60 text-lg hover:bg-primary hover:text-white transition">
                👤
              </Link>
              <button onClick={signOut} className="w-9 h-9 rounded-full flex items-center justify-center bg-surface text-primary/60 text-lg hover:bg-primary hover:text-white transition">
                ⏻
              </button>
            </>
          ) : (
            <Link to="/login" className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:opacity-90 transition">
              로그인
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}
