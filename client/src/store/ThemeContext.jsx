import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('moragora-theme') === 'dark'
  );

  // 초기 로드 시 dark 클래스 동기화
  useEffect(() => {
    document.getElementById('root')?.classList.toggle('dark', isDark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('moragora-theme', next ? 'dark' : 'light');
    document.getElementById('root')?.classList.toggle('dark', next);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
