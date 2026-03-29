import { useStarlogStore } from '../store';

export function useEntries() {
  const { entries } = useStarlogStore();
  return { entries, isLoading: false };
}
