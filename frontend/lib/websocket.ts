import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelays = [1000, 2000, 4000, 8000, 16000, 30000];
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageQueue: Array<{ event: string; data: any; moveId?: string }> = [];
  private isConnected = false;
  private listeners: Map<string, Set<Function>> = new Map();
  private offlineMoves: Array<{ gameId: string; move: string; promotion?: string; moveId: string; timestamp: number }> = [];

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = Cookies.get('accessToken');

    this.socket = io(`${apiUrl}/game`, {
      auth: {
        token,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
      this.replayOfflineMoves();
      this.startHeartbeat();
      this.syncGameState();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.stopHeartbeat();

      if (reason === 'io server disconnect') {
        this.socket?.connect();
      } else {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.scheduleReconnect();
    });

    this.socket.onAny((event, ...args) => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.forEach((listener) => {
          try {
            listener(...args);
          } catch (error) {
            console.error(`Error in listener for event ${event}:`, error);
          }
        });
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = this.reconnectDelays[
      Math.min(this.reconnectAttempts, this.reconnectDelays.length - 1)
    ];

    this.reconnectTimeout = setTimeout(() => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connect();
      } else {
        console.error('Max reconnection attempts reached');
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.emit(message.event, message.data);
      }
    }
  }

  emit(event: string, data: any, moveId?: string): void {
    if (this.isConnected && this.socket) {
      this.socket.emit(event, { ...data, moveId });
    } else {
      if (event === 'make_move') {
        const generatedMoveId = moveId || `${Date.now()}-${Math.random()}`;
        this.offlineMoves.push({
          gameId: data.gameId,
          move: data.move,
          promotion: data.promotion,
          moveId: generatedMoveId,
          timestamp: Date.now(),
        });
        this.saveOfflineMoves();
      }
      this.messageQueue.push({ event, data, moveId });
    }
  }

  private saveOfflineMoves(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('offline_moves', JSON.stringify(this.offlineMoves));
    }
  }

  private loadOfflineMoves(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('offline_moves');
      if (stored) {
        this.offlineMoves = JSON.parse(stored);
      }
    }
  }

  private async replayOfflineMoves(): Promise<void> {
    this.loadOfflineMoves();
    if (this.offlineMoves.length === 0) return;

    for (const move of this.offlineMoves) {
      if (this.isConnected && this.socket) {
        this.socket.emit('make_move', {
          gameId: move.gameId,
          move: move.move,
          promotion: move.promotion,
          moveId: move.moveId,
        });
      }
    }

    this.offlineMoves = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('offline_moves');
    }
  }

  private async syncGameState(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        const api = (await import('./api')).default;
        const response = await api.get('/game/active');
        if (response.data) {
          this.socket?.emit('join_game', { gameId: response.data.id });
        }
      } catch (error) {
        console.error('Failed to sync game state:', error);
      }
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: Function): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.messageQueue = [];
    this.listeners.clear();
  }

  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

export const wsManager = new WebSocketManager();

