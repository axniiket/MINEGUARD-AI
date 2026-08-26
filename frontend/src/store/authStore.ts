import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('mineguard_token'),
  user: null,
  isAuthenticated: !!localStorage.getItem('mineguard_token'),
  setToken: (token) => {
    localStorage.setItem('mineguard_token', token);
    set({ token, isAuthenticated: true });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem('mineguard_token');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
