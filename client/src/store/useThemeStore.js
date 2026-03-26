import { create } from 'zustand';

const useThemeStore = create((set) => ({
  isDark: localStorage.getItem('moragora-theme') === 'dark',
  toggleTheme: () => set((state) => {
    const next = !state.isDark;
    localStorage.setItem('moragora-theme', next ? 'dark' : 'light');
    document.getElementById('root')?.classList.toggle('dark', next);
    return { isDark: next };
  }),
}));

// 초기 로드 시 dark 클래스 동기화
document.getElementById('root')?.classList.toggle('dark', useThemeStore.getState().isDark);

export default useThemeStore;
