import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getServerUrl } from '../utils/api';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    const serverUrl = getServerUrl();
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000
    });

    setSocket(socket);

    socket.on('connect', () => {
      setIsConnected(true);
      setSocketId(socket.id);
      console.log('[Socket] Connected with ID:', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setSocketId(null);
      console.log('[Socket] Disconnected');
    });

    return () => {
      socket.disconnect();
      setSocket(null);
    };
  }, []);

  return {
    socket,
    isConnected,
    socketId
  };
}
