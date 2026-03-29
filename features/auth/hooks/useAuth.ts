import { useAuthStore } from '../store';

export function useAuth() {
  const { user, isLoading, isAuthenticated } = useAuthStore();
  return { user, isLoading, isAuthenticated };
}
