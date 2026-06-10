import { create } from 'zustand';
import type { Role } from '@/types/roles';

type AuthState = {
  userId?: string;
  role?: Role;
  setUser: (payload: { userId: string; role: Role }) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  userId: undefined,
  role: undefined,
  setUser: (payload) => set(payload),
  clearUser: () => set({ userId: undefined, role: undefined }),
}));
