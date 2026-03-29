import { useAuthStore } from '../store';

export function useSession() {
  const { session } = useAuthStore();
  return { session };
}
