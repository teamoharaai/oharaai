import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import supabase from '@/lib/db/client';
import { Typography } from '@/components/ui/Typography';

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSignup() {
    if (!displayName || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        emailRedirectTo: 'https://oharaai.vercel.app/callback',
      },
    });
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    setLoading(false);

    if (data.session) {
      router.replace('/(app)/dashboard');
      return;
    }

    setSuccessMessage('Check your email to confirm your account, then log in.');
  }

  return (
    <View className="flex-1 bg-cream">
      <View className="flex-1 justify-center px-6" style={{ maxWidth: 420, width: '100%', alignSelf: 'center' }}>
        {/* Wordmark */}
        <Text className="text-3xl text-near-black tracking-tight mb-2" style={{ fontFamily: 'Inter-Bold' }}>
          Ohara
        </Text>
        <Typography variant="body" className="mb-10">
          Create your account.
        </Typography>

        {/* Error */}
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-6">
            <Text className="text-sm text-red-600" style={{ fontFamily: 'Inter-Regular' }}>{error}</Text>
          </View>
        )}

        {successMessage && (
          <View className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-6">
            <Text className="text-sm text-green-700" style={{ fontFamily: 'Inter-Regular' }}>{successMessage}</Text>
          </View>
        )}

        {/* Display name */}
        <Typography variant="field-label" className="mb-1.5">Display name</Typography>
        <TextInput
          className="bg-card-bg rounded-2xl px-4 py-3.5 text-base text-near-black mb-4 border border-transparent"
          placeholder="Your name"
          placeholderTextColor="#6B6B6B"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoComplete="name"
        />

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
          placeholder="At least 6 characters"
          placeholderTextColor="#6B6B6B"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        {/* Submit */}
        <TouchableOpacity
          className="bg-near-black rounded-full py-4 items-center mb-6"
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FAF9F6" />
          ) : (
            <Text className="text-base text-cream font-inter-semibold" style={{ fontFamily: 'Inter-SemiBold' }}>Create account</Text>
          )}
        </TouchableOpacity>

        {/* Log in link */}
        <View className="flex-row justify-center">
          <Typography variant="subtitle">Already have an account? </Typography>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Typography variant="emphasis-sm" style={{ color: '#211F1A' }}>Log in</Typography>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}
