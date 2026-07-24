import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import supabase from '@/lib/db/client';
import { Typography } from '@/components/ui/Typography';
import { PublicNav } from '@/components/landing/PublicNav';
import { LIGHT_THEME } from '@/constants/colors';
import { resolveAuthSiteUrl } from '@/lib/auth/redirects';

// Mirror the DB CHECK on profiles.username exactly (migration 028):
// lowercase letters, digits, underscore, 3-20 chars.
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// Advisory availability states. The server-side trigger (handle_new_user) is the
// real source of truth and dedupes on its own, so 'error' never blocks submit.
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const usernameValid = USERNAME_RE.test(username);

  // Lowercase as the user types (reject uppercase by normalizing, not erroring).
  function handleUsernameChange(text: string) {
    setUsername(text.toLowerCase());
  }

  // Debounced, advisory availability check. Only runs for well-formed usernames.
  // Uses a monotonic request token so stale responses can't overwrite a newer state.
  const checkTokenRef = useRef(0);
  useEffect(() => {
    if (!usernameValid) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    const token = ++checkTokenRef.current;
    const handle = setTimeout(async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc(
          'search_profiles_by_username',
          { query: username },
        );
        if (token !== checkTokenRef.current) return; // superseded by newer input
        if (rpcError) {
          setUsernameStatus('error');
          return;
        }
        const taken = (data ?? []).some(
          (row: { username?: string | null }) =>
            (row.username ?? '').toLowerCase() === username,
        );
        setUsernameStatus(taken ? 'taken' : 'available');
      } catch {
        if (token !== checkTokenRef.current) return;
        setUsernameStatus('error');
      }
    }, 450);
    return () => clearTimeout(handle);
  }, [username, usernameValid]);

  async function handleSignup() {
    if (!displayName || !username || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!usernameValid) {
      setError('Username must be 3-20 characters: lowercase letters, numbers, or underscore.');
      return;
    }
    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
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
          username,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        emailRedirectTo: `${resolveAuthSiteUrl()}/callback`,
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
    <View style={{ backgroundColor: LIGHT_THEME.background.page, flex: 1 }}>
      <PublicNav />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <View className="flex-1 justify-center px-6" style={{ maxWidth: 420, width: '100%', alignSelf: 'center', paddingVertical: 40 }}>
        {/* Wordmark */}
        <Text className="text-3xl tracking-tight mb-2" style={{ color: LIGHT_THEME.text.primary, fontFamily: 'Inter-Bold' }}>
          Ohara
        </Text>
        <Typography variant="body" className="mb-10">
          Create your account.
        </Typography>

        {/* Error */}
        {error && (
          <View className="rounded-2xl px-4 py-3 mb-6" style={{ backgroundColor: LIGHT_THEME.feedback.danger.bg, borderColor: LIGHT_THEME.feedback.danger.border, borderWidth: 1 }}>
            <Text className="text-sm" style={{ color: LIGHT_THEME.feedback.danger.text, fontFamily: 'Inter-Regular' }}>{error}</Text>
          </View>
        )}

        {successMessage && (
          <View className="rounded-2xl px-4 py-3 mb-6" style={{ backgroundColor: LIGHT_THEME.background.selectedRow, borderColor: LIGHT_THEME.border.accent, borderWidth: 1 }}>
            <Text className="text-sm" style={{ color: LIGHT_THEME.text.accent, fontFamily: 'Inter-Regular' }}>{successMessage}</Text>
          </View>
        )}

        {/* Display name */}
        <Typography variant="field-label" className="mb-1.5">Display name</Typography>
        <TextInput
          className="rounded-2xl px-4 py-3.5 text-base mb-4"
          style={{ backgroundColor: LIGHT_THEME.background.input, borderColor: LIGHT_THEME.border.input, borderWidth: 1, color: LIGHT_THEME.text.primary }}
          placeholder="Your name"
          placeholderTextColor={LIGHT_THEME.text.muted}
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoComplete="name"
        />

        {/* Username */}
        <Typography variant="field-label" className="mb-1.5">Username</Typography>
        <TextInput
          className="rounded-2xl px-4 py-3.5 text-base mb-1.5"
          style={{ backgroundColor: LIGHT_THEME.background.input, borderColor: LIGHT_THEME.border.input, borderWidth: 1, color: LIGHT_THEME.text.primary }}
          placeholder="lowercase_handle"
          placeholderTextColor={LIGHT_THEME.text.muted}
          value={username}
          onChangeText={handleUsernameChange}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          maxLength={20}
        />
        <Text
          className="text-xs mb-4"
          style={{
            fontFamily: 'Inter-Regular',
            color:
              usernameStatus === 'taken'
                ? LIGHT_THEME.feedback.danger.text
                : usernameStatus === 'available'
                ? LIGHT_THEME.text.accent
                : LIGHT_THEME.text.muted,
          }}
        >
          {!usernameValid
            ? '3–20 characters: lowercase letters, numbers, or underscore.'
            : usernameStatus === 'checking'
            ? 'Checking availability…'
            : usernameStatus === 'available'
            ? 'Username available.'
            : usernameStatus === 'taken'
            ? 'That username is taken.'
            : ' '}
        </Text>

        {/* Email */}
        <Typography variant="field-label" className="mb-1.5">Email</Typography>
        <TextInput
          className="rounded-2xl px-4 py-3.5 text-base mb-4"
          style={{ backgroundColor: LIGHT_THEME.background.input, borderColor: LIGHT_THEME.border.input, borderWidth: 1, color: LIGHT_THEME.text.primary }}
          placeholder="you@example.com"
          placeholderTextColor={LIGHT_THEME.text.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        {/* Password */}
        <Typography variant="field-label" className="mb-1.5">Password</Typography>
        <TextInput
          className="rounded-2xl px-4 py-3.5 text-base mb-6"
          style={{ backgroundColor: LIGHT_THEME.background.input, borderColor: LIGHT_THEME.border.input, borderWidth: 1, color: LIGHT_THEME.text.primary }}
          placeholder="At least 10 characters"
          placeholderTextColor={LIGHT_THEME.text.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        {/* Submit */}
        <TouchableOpacity
          className="rounded-full py-4 items-center mb-6"
          style={{ backgroundColor: LIGHT_THEME.accent.primary, opacity: loading ? 0.65 : 1 }}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={LIGHT_THEME.text.onAccent} />
          ) : (
            <Text className="text-base font-inter-semibold" style={{ color: LIGHT_THEME.text.onAccent, fontFamily: 'Inter-SemiBold' }}>Create account</Text>
          )}
        </TouchableOpacity>

        {/* Log in link */}
        <View className="flex-row justify-center">
          <Typography variant="subtitle">Already have an account? </Typography>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Typography variant="emphasis-sm" style={{ color: LIGHT_THEME.text.accent }}>Log in</Typography>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}
