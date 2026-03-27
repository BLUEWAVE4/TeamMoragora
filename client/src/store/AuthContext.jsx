import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import api, { setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // role 조회 (서버 API 경유 — RLS 우회)
  const fetchRole = async () => {
    try {
      const data = await api.get('/profiles/me/role');
      setIsAdmin(data?.role === 'admin');
    } catch (err) {
      console.error('[AuthContext] role 조회 실패:', err?.response?.status, err?.message);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    // Get initial session + 토큰 캐시 초기화
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthToken(session?.access_token || null);
      setUser(session?.user ?? null);
      if (session?.user) fetchRole();
      setLoading(false);
    });

    // Listen for auth changes — 토큰 캐시도 여기서 단일 관리
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthToken(session?.access_token || null);
        setUser(session?.user ?? null);
        if (session?.user) fetchRole();
        else setIsAdmin(false);

        // OAuth 로그인 완료 후 저장된 리다이렉트 경로로 이동
        if (event === 'SIGNED_IN' && session?.user) {
          const redirect = sessionStorage.getItem('redirectAfterLogin');
          if (redirect) {
            sessionStorage.removeItem('redirectAfterLogin');
            if (window.location.pathname !== redirect) {
              navigate(redirect, { replace: true });
            }
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithKakao = () =>
    supabase.auth.signInWithOAuth({ provider: 'kakao' });

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({ provider: 'google' });

  const signOut = () => supabase.auth.signOut();

  const updateProfile = async (data) => {
    try {
      await api.patch('/profiles/me', {
        nickname: data.nickname,
        gender: data.gender,
        age: data.age,
      });
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signInWithKakao, signInWithGoogle, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
