import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type User } from '../types/index';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: {
        id: '1',
        name: 'Alex Carter',
        email: 'alex@example.com',
        plan: 'standard',
        avatar: 'https://github.com/shadcn.png'
      },
      isAuthenticated: true,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'focus-flow-auth',
    }
  )
);
