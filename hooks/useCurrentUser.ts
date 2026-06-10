import { useAuthStore } from '@/store/useAuthStore';

export function useCurrentUser() {
  return useAuthStore((state) => ({
    userId: state.userId,
    role: state.role,
  }));
}
