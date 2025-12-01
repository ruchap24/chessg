import { create } from 'zustand';

export interface Move {
  id: string;
  gameId: string;
  playerId: string;
  moveNotation: string;
  fen: string;
  moveNumber: number;
  createdAt: string;
}

export interface Game {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  status: string;
  result?: string | null;
  pgn?: string | null;
  currentFen: string;
  roomCode?: string | null;
  isPrivate: boolean;
  isBotGame?: boolean;
  botDifficulty?: string | null;
  whitePlayer?: {
    id: string;
    username: string;
    isBot?: boolean;
    eloRating?: number;
  };
  blackPlayer?: {
    id: string;
    username: string;
    isBot?: boolean;
    eloRating?: number;
  };
  lastMoveAt?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

interface GameState {
  currentGame: Game | null;
  fen: string;
  moves: Move[];
  playerColor: 'white' | 'black' | null;
  gameStatus: string;
  capturedPieces: { white: string[]; black: string[] };
  isPlayingBot: boolean;
  botDifficulty: string | null;
  isBotThinking: boolean;
  updateGame: (game: Game) => void;
  makeMove: (move: Move) => void;
  updateFen: (fen: string) => void;
  addMove: (move: Move) => void;
  setPlayerColor: (color: 'white' | 'black') => void;
  setGameStatus: (status: string) => void;
  setResult: (result: string) => void;
  setIsPlayingBot: (isBot: boolean) => void;
  setBotDifficulty: (difficulty: string) => void;
  setBotThinking: (thinking: boolean) => void;
  reset: () => void;
}

const initialState = {
  currentGame: null,
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves: [],
  playerColor: null,
  gameStatus: 'waiting',
  capturedPieces: { white: [], black: [] },
  isPlayingBot: false,
  botDifficulty: null,
  isBotThinking: false,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  updateGame: (game: Game) => {
    set({
      currentGame: game,
      fen: game.currentFen,
      gameStatus: game.status,
    });
  },

  makeMove: (move: Move) => {
    set((state) => ({
      moves: [...state.moves, move],
      fen: move.fen,
    }));
  },

  updateFen: (fen: string) => {
    set({ fen });
  },

  addMove: (move: Move) => {
    set((state) => ({
      moves: [...state.moves, move],
    }));
  },

  setPlayerColor: (color: 'white' | 'black') => {
    set({ playerColor: color });
  },

  setGameStatus: (status: string) => {
    set({ gameStatus: status });
  },

  setResult: (result: string) => {
    set((state) => ({
      currentGame: state.currentGame
        ? { ...state.currentGame, result }
        : null,
    }));
  },

  setIsPlayingBot: (isBot: boolean) => {
    set({ isPlayingBot: isBot });
  },

  setBotDifficulty: (difficulty: string) => {
    set({ botDifficulty: difficulty });
  },

  setBotThinking: (thinking: boolean) => {
    set({ isBotThinking: thinking });
  },

  reset: () => {
    set(initialState);
  },
}));

