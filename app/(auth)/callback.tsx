import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import supabase from '@/lib/db/client';
import { Typography } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { PublicAuthShell } from '@/components/landing/PublicAuthShell';
import { authLinkErrorMessage, safeAuthReturnTo } from '@/lib/auth/redirects';

export default function AuthCallbackScreen() {
  const { code, error, error_code, returnTo } = useLocalSearchParams<{
    code?: string | string[]; error?: string; error_code?: string; returnTo?: string;
  }>();
  const [failure, setFailure] = useState(authLinkErrorMessage(error || error_code));
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (error || error_code) return;
    async function handleCallback() {
      try {
        const authCode = Array.isArray(code) ? code[0] : code;

        if (authCode) {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(authCode);
          if (error) {
            setFailure(authLinkErrorMessage('verification_failed'));
            return;
          }

          // auth-js tracks the PKCE request kind alongside the code verifier,
          // but its public AuthTokenResponse type omits this runtime field.
          const redirectType = (
            data as typeof data & { redirectType?: string | null }
          ).redirectType;

          if (
            redirectType === 'PASSWORD_RECOVERY' ||
            redirectType === 'recovery'
          ) {
            router.replace('/(auth)/reset-password' as Href);
            return;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          router.replace(safeAuthReturnTo(returnTo) as Href);
        } else {
          setFailure(authLinkErrorMessage('no_session'));
        }
      } catch {
        setFailure(authLinkErrorMessage('verification_failed'));
      }
    }

    handleCallback();
  }, [code, error, error_code, returnTo]);

  if (failure) return (
    <PublicAuthShell mode="login" title="This link couldn't be verified." subtitle="Your existing account has not been changed.">
      <Typography accessibilityRole="alert" variant="body">{failure}</Typography>
      <Button onPress={() => router.replace('/(auth)/login')}>Continue to sign in</Button>
    </PublicAuthShell>
  );

  return (
    <View className="flex-1 bg-cream justify-center items-center">
      <ActivityIndicator size="large" color="#1A1A1A" />
      <Typography variant="body" className="mt-4">Verifying your secure link...</Typography>
    </View>
  );
}
