import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import supabase from '@/lib/db/client';
import { Typography } from '@/components/ui/Typography';

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
      setError(error.message);
    } else {
      router.replace('/(app)/dashboard');
    }
  }

  return (
    <View className="flex-1 bg-cream">
      <View className="flex-1 justify-center px-6" style={{ maxWidth: 420, width: '100%', alignSelf: 'center' }}>
        {/* Wordmark */}
        <Text className="text-3xl text-near-black tracking-tight mb-2" style={{ fontFamily: 'Inter-Bold' }}>
          Ohara
        </Text>
        <Typography variant="body" className="mb-10">
          Welcome back.
        </Typography>

        {/* Error */}
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-6">
            <Text className="text-sm text-red-600" style={{ fontFamily: 'Inter-Regular' }}>{error}</Text>
          </View>
        )}

        {/* Email */}
        <Typography variant="field-label" className="mb-1.5">Email</Typography>
        <TextInput
          className="bg-card-bg rounded-2xl px-4 py-3.5 text-base text-near-black mb-4 border border-transparent"
          placeholder="you@example.com"
          placeholderTextColor="#6B6B6B"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        {/* Password */}
        <Typography variant="field-label" className="mb-1.5">Password</Typography>
        <TextInput
          className="bg-card-bg rounded-2xl px-4 py-3.5 text-base text-near-black mb-6 border border-transparent"
          placeholder="••••••••"
          placeholderTextColor="#6B6B6B"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        {/* Submit */}
        <TouchableOpacity
          className="bg-near-black rounded-full py-4 items-center mb-6"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FAF9F6" />
          ) : (
            <Text className="text-base text-cream font-semibold" style={{ fontFamily: 'Inter-SemiBold' }}>Log in</Text>
          )}
        </TouchableOpacity>

        {/* Sign up link */}
        <View className="flex-row justify-center">
          <Typography variant="subtitle">Don't have an account? </Typography>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Typography variant="emphasis-sm" style={{ color: '#211F1A' }}>Sign up</Typography>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}
