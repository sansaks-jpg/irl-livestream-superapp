import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { getServerUrl } from '../utils/api';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const serverUrl = getServerUrl();
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

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
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    socketId
  };
}
