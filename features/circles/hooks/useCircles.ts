import { useMemo } from 'react';
import { MY_GOALS, MY_REFLECTIONS, PUBLIC_GOALS } from '../fixtures';
import { selectVisiblePosts, useCirclesStore } from '../store';

/**
 * Circles data hook. PROTOTYPE: reads fixture-backed local state only.
 * When a backend exists, this is the seam where services replace fixtures.
 */
export function useCircles() {
  const store = useCirclesStore();
  const visiblePosts = useMemo(
    () => selectVisiblePosts(store.posts, store.filter, store.scope),
    [store.posts, store.filter, store.scope],
  );
  return {
    ...store,
    publicGoals: PUBLIC_GOALS,
    myGoals: MY_GOALS,
    myReflections: MY_REFLECTIONS,
    visiblePosts,
  };
}
