import { io } from 'socket.io-client';

const URL = import.meta.env.DEV
  ? 'http://localhost:5000'
  : 'https://teammoragora.onrender.com';

export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});
