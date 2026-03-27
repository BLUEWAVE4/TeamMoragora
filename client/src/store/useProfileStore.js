import { create } from 'zustand';
import api from '../services/api';

const useProfileStore = create((set, get) => ({
  avatar_url: null,
  gender: null,
  nickname: null,
  _loaded: false,

  fetchProfile: async () => {
    if (get()._loaded) return; // 이미 로드됨 — 중복 호출 방지
    try {
      const data = await api.get('/profiles/me');
      set({ avatar_url: data?.avatar_url, gender: data?.gender, nickname: data?.nickname, _loaded: true });
    } catch { }
  },

  // 프로필 수정 후 즉시 반영
  setProfile: (patch) => set(patch),

  // 로그아웃 시 초기화
  reset: () => set({ avatar_url: null, gender: null, nickname: null, _loaded: false }),
}));

export default useProfileStore;
