import { useEffect } from 'react';
import { useWebSocketStore } from '../store/websocketStore';

export const useWebSocket = () => {
  const { connect, disconnect, emit, on, off, isConnected, reconnecting } = useWebSocketStore();

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    reconnecting,
    emit,
    on,
    off,
  };
};

