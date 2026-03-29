import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import supabase from '@/lib/db/client';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    async function handleCallback() {
      try {
        // PKCE flow: code in query params
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
          router.replace('/(app)/dashboard');
          return;
        }

        // Implicit flow: access_token in hash fragment (web only)
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (data.session) {
            router.replace('/(app)/dashboard');
            return;
          }
        }

        // Nothing found
        throw new Error('No auth code or token found.');
      } catch {
        router.replace('/(auth)/login?error=Verification+failed%2C+please+try+again.');
      }
    }

    handleCallback();
  }, [params.code]);

  return (
    <View className="flex-1 bg-cream justify-center items-center">
      <ActivityIndicator size="large" color="#1A1A1A" />
      <Text className="text-base text-muted mt-4">Verifying your account...</Text>
    </View>
  );
}
