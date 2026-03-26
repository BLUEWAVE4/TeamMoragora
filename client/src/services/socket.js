import { io } from 'socket.io-client';

const URL = import.meta.env.DEV
  ? 'http://localhost:5000'
  : 'https://teammoragora.onrender.com';

export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});
