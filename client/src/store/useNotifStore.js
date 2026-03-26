import { create } from 'zustand';

const useNotifStore = create((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
}));

export default useNotifStore;
