import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_400Regular_Italic,
} from '@expo-google-fonts/inter';
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_500Medium,
  Lora_500Medium_Italic,
  Lora_600SemiBold,
  Lora_600SemiBold_Italic,
} from '@expo-google-fonts/lora';
import supabase from '@/lib/db/client';
import { useAuthStore } from '@/features/auth/store';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { colorScheme } from 'nativewind';
import '../global.css';

export default function RootLayout() {
  const themeMode = useUIStore((state) => state.themeMode);
  const colors = useThemeColors();
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Inter-ExtraBold': Inter_800ExtraBold,
    'Inter-Italic': Inter_400Regular_Italic,
    // The focused Echo creation flow uses Lora for assistant voice and display hierarchy.
    'Lora-Regular': Lora_400Regular,
    'Lora-Italic': Lora_400Regular_Italic,
    'Lora-Medium': Lora_500Medium,
    'Lora-MediumItalic': Lora_500Medium_Italic,
    'Lora-SemiBold': Lora_600SemiBold,
    'Lora-SemiBoldItalic': Lora_600SemiBold_Italic,
  });

  const { session, loading, setSession, setLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    colorScheme.set(themeMode);
  }, [themeMode]);

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
    const onAuthCompletionRoute =
      inAuthGroup &&
      (seg[1] === 'callback' || seg[1] === 'reset-password');
    const onLandingPage = seg.length === 0;

    // DEV BYPASS: comment out the first condition to skip auth and go straight to app
    if (!session && inAppGroup && !__DEV__) {
      router.replace('/(auth)/login');
    } else if (
      session &&
      ((inAuthGroup && !onAuthCompletionRoute) || onLandingPage)
    ) {
      router.replace('/(app)/dashboard');
    }
  }, [session, loading, segments]);

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.page }}>
        <ActivityIndicator size="large" color={colors.text.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="about" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
