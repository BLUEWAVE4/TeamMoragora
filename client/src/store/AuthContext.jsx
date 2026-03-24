import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchRole();
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) fetchRole();
        else setIsAdmin(false);

        // OAuth 로그인 완료 후 저장된 리다이렉트 경로로 이동
        if (event === 'SIGNED_IN' && session?.user) {
          const redirect = sessionStorage.getItem('redirectAfterLogin');
          if (redirect) {
            sessionStorage.removeItem('redirectAfterLogin');
            // 현재 페이지가 이미 해당 경로가 아닐 때만 이동
            if (window.location.pathname !== redirect) {
              window.location.href = redirect;
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
    // 1. auth user_metadata 업데이트
    const { error } = await supabase.auth.updateUser({
      data: { nickname: data.nickname, gender: data.gender, age: data.age }
    });
    if (error) return { error };

    // 2. profiles 테이블도 동기화
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const profileUpdate = { nickname: data.nickname };
      if (data.gender) profileUpdate.gender = data.gender;
      if (data.age) profileUpdate.age = parseInt(data.age);
      await supabase.from('profiles').update(profileUpdate).eq('id', currentUser.id);
    }

    return { error: null };
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
