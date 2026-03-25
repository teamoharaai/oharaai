import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import supabase from '@/lib/db/client';

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, display_name: displayName });
      if (profileError) {
        setLoading(false);
        setError(profileError.message);
        return;
      }
    }

    setLoading(false);
    router.replace('/(tabs)/dashboard');
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-cream"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6" style={{ maxWidth: 420, width: '100%', alignSelf: 'center' }}>
        {/* Wordmark */}
        <Text className="text-3xl font-bold text-near-black tracking-tight mb-2">
          Ohara
        </Text>
        <Text className="text-base text-muted mb-10">
          Create your account.
        </Text>

        {/* Error */}
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-6">
            <Text className="text-sm text-red-600">{error}</Text>
          </View>
        )}

        {/* Display name */}
        <Text className="text-sm font-medium text-near-black mb-1.5">Display name</Text>
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
        <Text className="text-sm font-medium text-near-black mb-1.5">Email</Text>
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
        <Text className="text-sm font-medium text-near-black mb-1.5">Password</Text>
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
            <Text className="text-base text-cream font-semibold">Create account</Text>
          )}
        </TouchableOpacity>

        {/* Log in link */}
        <View className="flex-row justify-center">
          <Text className="text-sm text-muted">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-sm text-near-black font-semibold">Log in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
