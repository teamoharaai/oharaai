import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import supabase from '@/lib/db/client';
import { Typography } from '@/components/ui/Typography';

export default function AuthCallbackScreen() {
  const { code } = useLocalSearchParams<{ code?: string | string[] }>();

  useEffect(() => {
    async function handleCallback() {
      try {
        const authCode = Array.isArray(code) ? code[0] : code;

        if (authCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(authCode);
          if (error) {
            router.replace('/(auth)/login?error=verification_failed');
            return;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          router.replace('/(app)/dashboard');
        } else {
          router.replace('/(auth)/login?error=no_session');
        }
      } catch {
        router.replace('/(auth)/login?error=verification_failed');
      }
    }

    handleCallback();
  }, [code]);

  return (
    <View className="flex-1 bg-cream justify-center items-center">
      <ActivityIndicator size="large" color="#1A1A1A" />
      <Typography variant="body" className="mt-4">Verifying your account...</Typography>
    </View>
  );
}
