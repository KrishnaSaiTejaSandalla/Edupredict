import { useAuthStore } from '@/store/auth.store';

export function useAuth() {
  const {
    driver,
    token,
    status,
    isAuthenticated,
    loading,
    error,
    rememberMe,
    login,
    logout,
    restoreSession,
    clearError,
  } = useAuthStore();

  return {
    driver,
    token,
    status,
    isAuthenticated,
    loading,
    error,
    rememberMe,
    login,
    logout,
    restoreSession,
    clearError,
    isIdle: status === 'idle',
    isRestoring: status === 'loading' && !isAuthenticated,
    hasError: !!error,
  };
}
