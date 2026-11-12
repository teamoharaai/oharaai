const PRODUCTION_SITE_URL = 'https://www.oharaai.com';

/** Only restore known workspace routes, never an external or authentication URL. */
export function safeAuthReturnTo(value: unknown): string {
  const fallback = '/dashboard';
  if (typeof value !== 'string' || value.length > 4096 || /[\\\u0000-\u0020]/.test(value)) return fallback;
  if (!/^\/(dashboard|goals|projects|notes|journal|reflections|sources|calendar|momentum|constellation|circles)(?:[/?#]|$)/.test(value)) return fallback;
  try {
    const url = new URL(value, 'https://workspace.invalid');
    // Reject normalization/traversal rather than allowing a different route.
    if (url.origin !== 'https://workspace.invalid' || url.pathname !== value.split(/[?#]/)[0]) return fallback;
    if (/%(?:2f|5c|2e|00|0a|0d)/i.test(url.pathname)) return fallback;
    return value;
  } catch { return fallback; }
}

export function authLinkErrorMessage(value: unknown): string | null {
  if (!value) return null;
  return 'This sign-in link is invalid or has expired. Please sign in or request a new link.';
}

/** Capture before sign-out; another expired request may already be on login. */
export function expiredSessionReturnTo(location?: { pathname: string; search: string; hash: string }): string {
  if (!location) return '/dashboard';
  if (location.pathname === '/login') return safeAuthReturnTo(new URLSearchParams(location.search).get('returnTo'));
  return safeAuthReturnTo(location.pathname + location.search + location.hash);
}

/**
 * Resolve the public base URL used in links sent by Supabase Auth.
 *
 * Expo public variables are embedded at build time. The browser origin fallback
 * keeps local and preview deployments on the same host when no explicit site
 * URL was supplied.
 */
export function resolveAuthSiteUrl(): string {
  const configured = process.env.EXPO_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return PRODUCTION_SITE_URL;
}
