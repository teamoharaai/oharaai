import { Redirect, type Href, useLocalSearchParams } from "expo-router";

import LandingPage from "@/components/landing/LandingPage";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Supabase falls back to the configured Site URL when a requested redirect is
 * not on the project's allowlist. Preserve one-time auth codes that arrive at
 * the root and move them to the callback route before they can be ignored by
 * the marketing landing page.
 */
export default function IndexScreen() {
  const params = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
    error_code?: string | string[];
  }>();
  const authCode = firstParam(params.code);
  const callbackError = firstParam(params.error) ?? firstParam(params.error_code);

  if (authCode) {
    return (
      <Redirect
        href={
          `/(auth)/callback?code=${encodeURIComponent(authCode)}` as Href
        }
      />
    );
  }

  if (callbackError) {
    return (
      <Redirect
        href={"/(auth)/login?error=verification_failed" as Href}
      />
    );
  }

  return <LandingPage />;
}
