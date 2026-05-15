import { io } from 'socket.io-client';
import { Platform } from 'react-native';

// In development with Expo, we need to use your computer's local IP address
// so your physical phone can talk to the local Node server on the same WiFi.
// Replace this with your actual cloud URL when you deploy the backend.
const SERVER_URL = 'http://192.168.68.179:3001';

export const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Mobile App Connected to PingTrack Server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Mobile App Disconnected from PingTrack Server');
});
