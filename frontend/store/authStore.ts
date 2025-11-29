import { create } from 'zustand';
import { api } from '../lib/api';

export interface User {
  id: string;
  email: string;
  username: string;
  eloRating: number;
  gamesPlayed: number;
  gamesWon: number;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  checkAuth: () => Promise<void>;
  registerGuest: () => Promise<void>;
  loginGuest: (username: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: (user: User, token: string) => {
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  setUser: (user: User) => {
    set({ user, isAuthenticated: !!user });
  },

  setToken: (token: string) => {
    set({ token });
  },

  checkAuth: async () => {
    try {
      const response = await api.get('/auth/me');
      set({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  registerGuest: async () => {
    try {
      const response = await api.post('/auth/guest/register');
      const { user, accessToken } = response.data;
      get().login(user, accessToken);
    } catch (error) {
      console.error('Guest registration error:', error);
      throw error;
    }
  },

  loginGuest: async (username: string) => {
    try {
      const response = await api.post('/auth/guest/login', { username });
      const { user, accessToken } = response.data;
      get().login(user, accessToken);
    } catch (error) {
      console.error('Guest login error:', error);
      throw error;
    }
  },
}));

