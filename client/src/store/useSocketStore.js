import { create } from 'zustand';
import { socket } from '../services/socket';

const useSocketStore = create((set) => ({
  connected: false,
}));

// 소켓 이벤트 리스너 등록 (store 외부에서 1회)
socket.on('connect', () => useSocketStore.setState({ connected: true }));
socket.on('disconnect', () => useSocketStore.setState({ connected: false }));

export default useSocketStore;
