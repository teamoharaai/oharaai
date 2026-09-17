import { useEffect, useMemo } from 'react';
import { FEATURES } from '@/constants/features';
import { useAuthStore } from '@/features/auth/store';
import type { CirclesAuthor } from '@/lib/db/circles-core';
import { selectVisiblePosts, useCirclesStore } from '../store';

/** Build the current user's author identity from the session (no extra fetch). */
function useMe(): CirclesAuthor | null {
  const session = useAuthStore((state) => state.session);
  return useMemo(() => {
    const user = session?.user;
    if (!user) return null;
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const displayName =
      (typeof metadata.display_name === 'string' && metadata.display_name)
      || (typeof metadata.full_name === 'string' && metadata.full_name)
      || (typeof metadata.name === 'string' && metadata.name)
      || (user.email ? user.email.split('@')[0] : '')
      || '';
    const username = typeof metadata.username === 'string' ? metadata.username : '';
    const avatarUrl = typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null;
    return { id: user.id, username, displayName, avatarUrl };
  }, [session]);
}

/**
 * Circles data hook. Reads the store (backed by the real endpoints) and, when
 * `FEATURES.CIRCLES_ENABLED`, triggers the one-time load on mount. With the flag
 * off it never fetches and the feed is empty.
 */
export function useCircles() {
  const store = useCirclesStore();
  const me = useMe();
  const setMe = store.setMe;
  const ensureLoaded = store.ensureLoaded;

  useEffect(() => {
    setMe(me);
  }, [me, setMe]);

  useEffect(() => {
    if (FEATURES.CIRCLES_ENABLED) void ensureLoaded();
  }, [ensureLoaded]);

  const visiblePosts = useMemo(
    () => selectVisiblePosts(store.posts, store.filter, store.scope),
    [store.posts, store.filter, store.scope],
  );

  return {
    ...store,
    enabled: FEATURES.CIRCLES_ENABLED,
    me,
    myId: me?.id ?? null,
    publicGoals: store.friendsPublicGoals,
    myGoals: store.linkable.goals,
    myReflections: store.linkable.reflections,
    visiblePosts,
  };
}
