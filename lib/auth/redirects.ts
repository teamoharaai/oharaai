const PRODUCTION_SITE_URL = 'https://oharaai.vercel.app';

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
