import { create } from 'zustand';
import api from '../services/api';

const ONBOARDING_KEY = 'moragora-onboarding-done';

const useProfileStore = create((set, get) => ({
  avatar_url: null,
  gender: null,
  nickname: null,
  _loaded: false,

  fetchProfile: async () => {
    if (get()._loaded) return;
    try {
      const data = await api.get('/profiles/me');
      set({ avatar_url: data?.avatar_url, gender: data?.gender, nickname: data?.nickname, _loaded: true });
      // 온보딩 상태 동기화 (DB → localStorage)
      if (data?.is_onboarding_done) localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch { }
  },

  // 프로필 수정 후 즉시 반영
  setProfile: (patch) => set(patch),

  // 로그아웃 시 초기화
  reset: () => set({ avatar_url: null, gender: null, nickname: null, _loaded: false }),
}));

export default useProfileStore;
