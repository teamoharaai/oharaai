import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Lora_400Regular, Lora_400Regular_Italic } from '@expo-google-fonts/lora';
import supabase from '@/lib/db/client';
import { useAuthStore } from '@/features/auth/store';
import '../global.css';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Lora-Regular': Lora_400Regular,
    'Lora-Italic': Lora_400Regular_Italic,
  });

  const { session, loading, setSession, setLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const seg = segments as unknown as string[];
    const inAppGroup = seg[0] === '(app)';
    const inAuthGroup = seg[0] === '(auth)';
    const onLandingPage = seg.length === 0;

    // DEV BYPASS: comment out the first condition to skip auth and go straight to app
    if (!session && inAppGroup && !__DEV__) {
      router.replace('/(auth)/login');
    } else if (session && (inAuthGroup || onLandingPage)) {
      router.replace('/(app)/dashboard');
    }
  }, [session, loading, segments]);

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF9F6' }}>
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="about" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
