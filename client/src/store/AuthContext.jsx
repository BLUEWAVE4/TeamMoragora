import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);

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
    const { error } = await supabase.auth.updateUser({
      data: { nickname: data.nickname, gender: data.gender, age: data.age }
    })
    return { error }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithKakao, signInWithGoogle, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
