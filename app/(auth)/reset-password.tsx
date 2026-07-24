import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, router, useLocalSearchParams, type Href } from 'expo-router';
import { PublicNav } from '@/components/landing/PublicNav';
import { Typography } from '@/components/ui/Typography';
import { LIGHT_THEME } from '@/constants/colors';
import supabase from '@/lib/db/client';

type RecoveryState = 'verifying' | 'ready' | 'invalid' | 'saved';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
  }>();
  const startedRef = useRef(false);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('verifying');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function prepareRecoverySession() {
      const callbackError = firstParam(params.error);
      const authCode = firstParam(params.code);

      if (callbackError) {
        setRecoveryState('invalid');
        return;
      }

      if (authCode) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(authCode);
        if (exchangeError) {
          setRecoveryState('invalid');
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      setRecoveryState(session ? 'ready' : 'invalid');
    }

    prepareRecoverySession().catch(() => setRecoveryState('invalid'));
  }, [params.code, params.error]);

  async function handlePasswordUpdate() {
    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setSaving(false);

    if (updateError) {
      setError(
        updateError.message ||
          'We could not update your password. Please request a new reset link and try again.',
      );
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setRecoveryState('saved');
  }

  return (
    <View style={{ backgroundColor: LIGHT_THEME.background.page, flex: 1 }}>
      <PublicNav />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="flex-1 justify-center px-6"
          style={{
            alignSelf: 'center',
            maxWidth: 420,
            paddingVertical: 40,
            width: '100%',
          }}
        >
          <Text
            className="text-3xl tracking-tight mb-2"
            style={{
              color: LIGHT_THEME.text.primary,
              fontFamily: 'Inter-Bold',
            }}
          >
            Choose a new password
          </Text>

          {recoveryState === 'verifying' && (
            <View className="items-center py-10">
              <ActivityIndicator
                color={LIGHT_THEME.accent.primary}
                size="large"
              />
              <Typography variant="body" className="mt-4">
                Verifying your reset link...
              </Typography>
            </View>
          )}

          {recoveryState === 'invalid' && (
            <>
              <Typography variant="body" className="mb-6">
                This reset link is invalid or has expired. Request a new one to continue.
              </Typography>
              <Link href={'/(auth)/forgot-password' as Href} asChild>
                <TouchableOpacity
                  accessibilityRole="link"
                  className="rounded-full py-4 items-center mb-6"
                  style={{ backgroundColor: LIGHT_THEME.accent.primary }}
                >
                  <Text
                    className="text-base"
                    style={{
                      color: LIGHT_THEME.text.onAccent,
                      fontFamily: 'Inter-SemiBold',
                    }}
                  >
                    Request a new link
                  </Text>
                </TouchableOpacity>
              </Link>
              <View className="flex-row justify-center">
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity accessibilityRole="link">
                    <Typography
                      variant="emphasis-sm"
                      style={{ color: LIGHT_THEME.text.accent }}
                    >
                      Back to log in
                    </Typography>
                  </TouchableOpacity>
                </Link>
              </View>
            </>
          )}

          {recoveryState === 'ready' && (
            <>
              <Typography variant="body" className="mb-10">
                Use at least 10 characters. Your new password will take effect immediately.
              </Typography>

              {error && (
                <View
                  className="rounded-2xl px-4 py-3 mb-6"
                  style={{
                    backgroundColor: LIGHT_THEME.feedback.danger.bg,
                    borderColor: LIGHT_THEME.feedback.danger.border,
                    borderWidth: 1,
                  }}
                >
                  <Text
                    className="text-sm"
                    style={{
                      color: LIGHT_THEME.feedback.danger.text,
                      fontFamily: 'Inter-Regular',
                    }}
                  >
                    {error}
                  </Text>
                </View>
              )}

              <Typography variant="field-label" className="mb-1.5">
                New password
              </Typography>
              <TextInput
                accessibilityLabel="New password"
                autoComplete="new-password"
                className="rounded-2xl px-4 py-3.5 text-base mb-4"
                onChangeText={setPassword}
                placeholder="••••••••••"
                placeholderTextColor={LIGHT_THEME.text.muted}
                secureTextEntry
                style={{
                  backgroundColor: LIGHT_THEME.background.input,
                  borderColor: LIGHT_THEME.border.input,
                  borderWidth: 1,
                  color: LIGHT_THEME.text.primary,
                }}
                value={password}
              />

              <Typography variant="field-label" className="mb-1.5">
                Confirm new password
              </Typography>
              <TextInput
                accessibilityLabel="Confirm new password"
                autoComplete="new-password"
                className="rounded-2xl px-4 py-3.5 text-base mb-6"
                onChangeText={setConfirmPassword}
                onSubmitEditing={handlePasswordUpdate}
                placeholder="••••••••••"
                placeholderTextColor={LIGHT_THEME.text.muted}
                returnKeyType="done"
                secureTextEntry
                style={{
                  backgroundColor: LIGHT_THEME.background.input,
                  borderColor: LIGHT_THEME.border.input,
                  borderWidth: 1,
                  color: LIGHT_THEME.text.primary,
                }}
                value={confirmPassword}
              />

              <TouchableOpacity
                accessibilityRole="button"
                className="rounded-full py-4 items-center"
                disabled={saving}
                onPress={handlePasswordUpdate}
                style={{
                  backgroundColor: LIGHT_THEME.accent.primary,
                  opacity: saving ? 0.65 : 1,
                }}
              >
                {saving ? (
                  <ActivityIndicator color={LIGHT_THEME.text.onAccent} />
                ) : (
                  <Text
                    className="text-base"
                    style={{
                      color: LIGHT_THEME.text.onAccent,
                      fontFamily: 'Inter-SemiBold',
                    }}
                  >
                    Update password
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {recoveryState === 'saved' && (
            <>
              <View
                className="rounded-2xl px-4 py-4 mb-6"
                style={{
                  backgroundColor: LIGHT_THEME.feedback.info.bg,
                  borderColor: LIGHT_THEME.feedback.info.border,
                  borderWidth: 1,
                }}
              >
                <Text
                  className="text-sm"
                  style={{
                    color: LIGHT_THEME.feedback.info.text,
                    fontFamily: 'Inter-Regular',
                    lineHeight: 21,
                  }}
                >
                  Your password has been updated. You&apos;re securely signed in and ready to continue.
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                className="rounded-full py-4 items-center"
                onPress={() => router.replace('/(app)/dashboard')}
                style={{ backgroundColor: LIGHT_THEME.accent.primary }}
              >
                <Text
                  className="text-base"
                  style={{
                    color: LIGHT_THEME.text.onAccent,
                    fontFamily: 'Inter-SemiBold',
                  }}
                >
                  Continue to Ohara
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
