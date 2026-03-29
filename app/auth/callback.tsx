import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import supabase from '@/lib/db/client';

export default function AuthCallbackScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    async function handleCallback() {
      try {
        if (code) {
          // PKCE flow: exchange the one-time code for a session
          const { error } = await supabase.auth.exchangeCodeForSession(
            Array.isArray(code) ? code[0] : code
          );
          if (error) {
            router.replace('/(auth)/login?error=verification_failed');
            return;
          }
        }

        // Implicit flow (hash fragment) is handled automatically by the Supabase JS client.
        // Either way, confirm a session now exists before redirecting.
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
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAF9F6',
      }}
    >
      <ActivityIndicator size="large" color="#1A1A1A" />
      <Text style={{ marginTop: 16, color: '#6B6B6B', fontSize: 16 }}>
        Verifying your account...
      </Text>
    </View>
  );
}
