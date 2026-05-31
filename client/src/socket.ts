import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:${window.location.port === '5173' ? '3001' : (window.location.port || '3001')}`;

export const socket = io(SOCKET_URL, { autoConnect: false });
