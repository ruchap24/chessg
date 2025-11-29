import { create } from 'zustand';
import { wsManager } from '../lib/websocket';

interface WebSocketState {
  isConnected: boolean;
  reconnecting: boolean;
  messageQueue: Array<{ event: string; data: any }>;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback?: Function) => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  isConnected: false,
  reconnecting: false,
  messageQueue: [],

  connect: () => {
    wsManager.on('connect', () => {
      set({ isConnected: true, reconnecting: false });
    });

    wsManager.on('disconnect', () => {
      set({ isConnected: false, reconnecting: true });
    });

    wsManager.on('reconnect', () => {
      set({ reconnecting: false });
    });

    wsManager.connect();
    set({ isConnected: wsManager.connected });
  },

  disconnect: () => {
    wsManager.disconnect();
    set({ isConnected: false, reconnecting: false, messageQueue: [] });
  },

  emit: (event: string, data: any) => {
    wsManager.emit(event, data);
  },

  on: (event: string, callback: Function) => {
    wsManager.on(event, callback);
  },

  off: (event: string, callback?: Function) => {
    wsManager.off(event, callback);
  },
}));

