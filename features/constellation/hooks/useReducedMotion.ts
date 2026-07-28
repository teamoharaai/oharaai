import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Reads the platform preference after mount so module initialization stays
 * safe during Expo web SSR. The graph itself is deliberately static; callers
 * use this only to replace indeterminate loading motion with a static mark.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReducedMotion(enabled);
      })
      .catch(() => {
        // Preference reads are advisory. Rendering remains available.
      });

    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      setReducedMotion,
    );

    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  return reducedMotion;
}
