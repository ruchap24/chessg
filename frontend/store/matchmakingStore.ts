import { create } from 'zustand';

interface MatchmakingState {
  inQueue: boolean;
  queueStartTime: number | null;
  roomCode: string | null;
  searchingFor: 'public' | 'private' | null;
  joinQueue: () => void;
  leaveQueue: () => void;
  createRoom: (roomCode: string) => void;
  joinRoom: (roomCode: string) => void;
  reset: () => void;
}

export const useMatchmakingStore = create<MatchmakingState>((set) => ({
  inQueue: false,
  queueStartTime: null,
  roomCode: null,
  searchingFor: null,

  joinQueue: () => {
    set({
      inQueue: true,
      queueStartTime: Date.now(),
      searchingFor: 'public',
    });
  },

  leaveQueue: () => {
    set({
      inQueue: false,
      queueStartTime: null,
      searchingFor: null,
    });
  },

  createRoom: (roomCode: string) => {
    set({
      roomCode,
      searchingFor: 'private',
    });
  },

  joinRoom: (roomCode: string) => {
    set({
      roomCode,
      searchingFor: 'private',
    });
  },

  reset: () => {
    set({
      inQueue: false,
      queueStartTime: null,
      roomCode: null,
      searchingFor: null,
    });
  },
}));

