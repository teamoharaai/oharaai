import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Link, router, useLocalSearchParams, type Href } from 'expo-router';
import supabase from '@/lib/db/client';
import { Typography } from '@/components/ui/Typography';
import { LIGHT_THEME } from '@/constants/colors';
import { PublicAuthShell, publicInputStyle } from '@/components/landing/PublicAuthShell';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ error?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(params.error ?? null);

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      // Generic copy for every sign-in failure. Supabase returns a distinct
      // "Email not confirmed" message for a known-but-unconfirmed account, which
      // would confirm an email is registered (account-existence enumeration).
      // Collapse all cases to one message so no path reveals existence.
      setError('Incorrect email or password.');
    } else {
      router.replace('/(app)/dashboard');
    }
  }

  return (
    <PublicAuthShell mode="login" title="Welcome back." subtitle="Continue your journey with OHARA.">
        {/* Error */}
        {error && (
          <View className="rounded-2xl px-4 py-3 mb-6" style={{ backgroundColor: LIGHT_THEME.feedback.danger.bg, borderColor: LIGHT_THEME.feedback.danger.border, borderWidth: 1 }}>
            <Text className="text-sm" style={{ color: LIGHT_THEME.feedback.danger.text, fontFamily: 'Inter-Regular' }}>{error}</Text>
          </View>
        )}

        {/* Email */}
        <Typography variant="field-label" className="mb-1.5">Email</Typography>
        <TextInput
          className="public-auth-input mb-4"
          style={publicInputStyle}
          placeholder="you@example.com"
          placeholderTextColor={LIGHT_THEME.text.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        {/* Password */}
        <View className="flex-row items-center justify-between mb-1.5">
          <Typography variant="field-label">Password</Typography>
          <Link href={'/(auth)/forgot-password' as Href} asChild>
            <TouchableOpacity accessibilityRole="link">
              <Typography
                variant="emphasis-sm"
                style={{ color: LIGHT_THEME.text.accent }}
              >
                Forgot password?
              </Typography>
            </TouchableOpacity>
          </Link>
        </View>
        <TextInput
          className="public-auth-input mb-6"
          style={publicInputStyle}
          placeholder="••••••••"
          placeholderTextColor={LIGHT_THEME.text.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        {/* Submit */}
        <TouchableOpacity
          className="rounded-full py-4 items-center mb-6"
          style={{ backgroundColor: LIGHT_THEME.accent.primary, minHeight: 50, opacity: loading ? 0.65 : 1 }}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={LIGHT_THEME.text.onAccent} />
          ) : (
            <Text className="text-base font-inter-semibold" style={{ color: LIGHT_THEME.text.onAccent, fontFamily: 'Inter-SemiBold' }}>Log in</Text>
          )}
        </TouchableOpacity>

        {/* Sign up link */}
        <View className="flex-row justify-center">
          <Typography variant="subtitle">Don't have an account? </Typography>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Typography variant="emphasis-sm" style={{ color: LIGHT_THEME.text.accent }}>Sign up</Typography>
            </TouchableOpacity>
          </Link>
        </View>
    </PublicAuthShell>
  );
}
