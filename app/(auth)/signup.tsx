import { useEffect, useRef, useState } from 'react';
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
import { LIGHT_THEME } from '@/constants/colors';
import { resolveAuthSiteUrl } from '@/lib/auth/redirects';
import { PublicAuthShell, publicInputStyle, publicActionStyle, publicActionTextColor, publicLinkColor } from '@/components/landing/PublicAuthShell';

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
    <PublicAuthShell mode="signup" title="Start your journey." subtitle="Create your OharaAI account and begin with what matters now.">
        {/* Error */}
        {error && (
          <View className="rounded-2xl px-4 py-3 mb-6" style={{ backgroundColor: LIGHT_THEME.feedback.danger.bg, borderColor: LIGHT_THEME.feedback.danger.border, borderWidth: 1 }}>
            <Text className="text-sm" style={{ color: LIGHT_THEME.feedback.danger.text, fontFamily: 'Inter-Regular' }}>{error}</Text>
          </View>
        )}

        {successMessage && (
          <View className="rounded-2xl px-4 py-3 mb-6" style={{ backgroundColor: LIGHT_THEME.background.selectedRow, borderColor: LIGHT_THEME.border.accent, borderWidth: 1 }}>
            <Text className="text-sm" style={{ color: publicLinkColor, fontFamily: 'Inter-Regular' }}>{successMessage}</Text>
          </View>
        )}

        {/* Display name */}
        <Typography style={{ color: LIGHT_THEME.text.primary }} variant="field-label" className="mb-1.5">Display name</Typography>
        <TextInput
          className="public-auth-input mb-4"
          style={publicInputStyle}
          accessibilityLabel="Display name"
          placeholder="Your name"
          placeholderTextColor={LIGHT_THEME.text.muted}
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoComplete="name"
        />

        {/* Username */}
        <Typography style={{ color: LIGHT_THEME.text.primary }} variant="field-label" className="mb-1.5">Username</Typography>
        <TextInput
          className="public-auth-input mb-1.5"
          style={publicInputStyle}
          accessibilityLabel="Username"
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
                ? publicLinkColor
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
        <Typography style={{ color: LIGHT_THEME.text.primary }} variant="field-label" className="mb-1.5">Email</Typography>
        <TextInput
          className="public-auth-input mb-4"
          style={publicInputStyle}
          accessibilityLabel="Email"
          placeholder="you@example.com"
          placeholderTextColor={LIGHT_THEME.text.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        {/* Password */}
        <Typography style={{ color: LIGHT_THEME.text.primary }} variant="field-label" className="mb-1.5">Password</Typography>
        <TextInput
          className="public-auth-input mb-6"
          style={publicInputStyle}
          accessibilityLabel="Password"
          placeholder="At least 10 characters"
          placeholderTextColor={LIGHT_THEME.text.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        {/* Submit */}
        <TouchableOpacity
          accessibilityRole="button"
          className="rounded-full py-4 items-center mb-6"
          style={{ ...publicActionStyle, minHeight: 50, opacity: loading ? 0.65 : 1 }}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={publicActionTextColor} />
          ) : (
            <Text className="text-base font-inter-semibold" style={{ color: publicActionTextColor, fontFamily: 'Inter-SemiBold' }}>Create account</Text>
          )}
        </TouchableOpacity>

        {/* Log in link */}
        <View className="flex-row justify-center">
          <Typography variant="subtitle" style={{ color: LIGHT_THEME.text.secondary }}>Already have an account? </Typography>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity accessibilityRole="link">
              <Typography variant="emphasis-sm" style={{ color: publicLinkColor }}>Log in</Typography>
            </TouchableOpacity>
          </Link>
        </View>
    </PublicAuthShell>
  );
}
