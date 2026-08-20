import { useCallback, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_400Regular_Italic } from '@expo-google-fonts/inter/400Regular_Italic';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_400Regular_Italic } from '@expo-google-fonts/lora/400Regular_Italic';
import { Lora_500Medium } from '@expo-google-fonts/lora/500Medium';
import { Lora_500Medium_Italic } from '@expo-google-fonts/lora/500Medium_Italic';
import { Lora_600SemiBold } from '@expo-google-fonts/lora/600SemiBold';
import { Lora_600SemiBold_Italic } from '@expo-google-fonts/lora/600SemiBold_Italic';
import supabase from '@/lib/db/client';
import { useAuthStore } from '@/features/auth/store';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { clearAllStores } from '@/store/clearAllStores';
import { colorScheme } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { startPerformanceTimer } from '@/lib/diagnostics/performance';
import { InternalReleaseNotesModal } from '@/components/layout/InternalReleaseNotesModal';
import { INTERNAL_RELEASE_NOTES, SHOW_INTERNAL_RELEASE_NOTES } from '@/config/internal-release';
import {
  getInternalReleaseSessionStorage,
  shouldShowInternalReleaseForAuthEvent,
} from '@/features/auth/internal-release';
import '../global.css';

export default function RootLayout() {
  const themeMode = useUIStore((state) => state.themeMode);
  const colors = useThemeColors();
  const [fontsLoaded, fontError] = useFonts({
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
  const activeUserIdRef = useRef<string | null>(null);
  const internalReleaseShownRef = useRef(false);
  const [internalReleaseVisible, setInternalReleaseVisible] = useState(false);
  const fontTimingRef = useRef<ReturnType<typeof startPerformanceTimer> | null>(null);
  if (!fontTimingRef.current) {
    fontTimingRef.current = startPerformanceTimer('root.font-bootstrap', { fontCount: 12 });
  }
  const segments = useSegments();
  const router = useRouter();
  const closeInternalRelease = useCallback(() => setInternalReleaseVisible(false), []);

  useEffect(() => {
    colorScheme.set(themeMode);
  }, [themeMode]);

  useEffect(() => {
    const applySession = (
      nextSession: typeof session,
    ): void => {
      const previousUserId = activeUserIdRef.current;
      const nextUserId = nextSession?.user.id ?? null;
      if (previousUserId && previousUserId !== nextUserId) {
        clearAllStores();
      }
      activeUserIdRef.current = nextUserId;
      setSession(nextSession);
    };

    const sessionTiming = startPerformanceTimer('root.session-bootstrap', { requestCount: 1 });

    supabase.auth.getSession()
      .then(({ data: { session: nextSession } }) => {
        applySession(nextSession);
        setLoading(false);
        sessionTiming.end({ success: true });
      })
      .catch(() => {
        sessionTiming.end({ success: false });
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      applySession(nextSession);
      if (event === 'SIGNED_OUT') {
        internalReleaseShownRef.current = false;
        setInternalReleaseVisible(false);
      }
      const shouldShow = !internalReleaseShownRef.current
        && shouldShowInternalReleaseForAuthEvent(
          event,
          INTERNAL_RELEASE_NOTES.id,
          SHOW_INTERNAL_RELEASE_NOTES,
          getInternalReleaseSessionStorage(),
        );
      if (shouldShow) {
        internalReleaseShownRef.current = true;
        setInternalReleaseVisible(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      fontTimingRef.current?.end({ success: true });
    } else if (fontError) {
      fontTimingRef.current?.end({ success: false });
    }
  }, [fontError, fontsLoaded]);

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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.page }}>
          <ActivityIndicator size="large" color={colors.text.primary} />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="about" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <InternalReleaseNotesModal
        onClose={closeInternalRelease}
        release={INTERNAL_RELEASE_NOTES}
        visible={!!session && internalReleaseVisible}
      />
    </GestureHandlerRootView>
  );
}
