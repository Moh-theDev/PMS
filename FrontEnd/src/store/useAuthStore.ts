import { create } from 'zustand';
import * as authService from '../features/auth/services/authService';
import { type LoginInput, type SignupInput } from '../features/auth/types';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginInput) => Promise<void>;
  register: (data: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (data: { name: string; avatar?: string }) => Promise<void>;
  deleteUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Setup event listener to clear session on token refresh failure
  if (typeof window !== 'undefined') {
    window.addEventListener('auth-session-expired', () => {
      set({ user: null, isAuthenticated: false, error: 'Your session has expired. Please log in again.' });
    });
  }

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,

    clearError: () => set({ error: null }),

    checkAuth: async () => {
      set({ isLoading: true, error: null });
      try {
        const profile = await authService.getMyProfile();
        set({
          user: {
            id: String(profile.id),
            name: profile.name,
            email: profile.email,
            avatar: profile.avatar || 'https://github.com/shadcn.png',
          },
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (err: any) {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },

    login: async (data: LoginInput) => {
      set({ isLoading: true, error: null });
      try {
        await authService.login(data);
        await get().checkAuth();
      } catch (err: any) {
        const message = err.response?.data || 'Failed to log in. Please check your credentials.';
        set({ error: typeof message === 'string' ? message : 'Login failed', isLoading: false });
        throw err;
      }
    },

    register: async (data: SignupInput) => {
      set({ isLoading: true, error: null });
      try {
        await authService.signup(data);
        await get().checkAuth();
      } catch (err: any) {
        const message = err.response?.data || 'Failed to register. Please try again.';
        set({ error: typeof message === 'string' ? message : 'Registration failed', isLoading: false });
        throw err;
      }
    },

    logout: async () => {
      set({ isLoading: true });
      try {
        await authService.logout();
      } catch (err) {
        // Even if request fails, clear local credentials
      } finally {
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
      }
    },

    updateUser: async (data: { name: string; avatar?: string }) => {
      set({ isLoading: true, error: null });
      try {
        await authService.updateProfile(data);
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              name: data.name,
              avatar: data.avatar || currentUser.avatar,
            },
          });
        }
        set({ isLoading: false });
      } catch (err: any) {
        const message = err.response?.data || 'Failed to update profile.';
        set({ error: typeof message === 'string' ? message : 'Update failed', isLoading: false });
        throw err;
      }
    },

    deleteUser: async () => {
      set({ isLoading: true, error: null });
      try {
        await authService.deleteAccount();
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
      } catch (err: any) {
        const message = err.response?.data || 'Failed to delete account.';
        set({ error: typeof message === 'string' ? message : 'Deletion failed', isLoading: false });
        throw err;
      }
    },
  };
});
