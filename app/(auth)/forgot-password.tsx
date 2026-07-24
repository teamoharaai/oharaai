import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { PublicNav } from '@/components/landing/PublicNav';
import { Typography } from '@/components/ui/Typography';
import { LIGHT_THEME } from '@/constants/colors';
import { resolveAuthSiteUrl } from '@/lib/auth/redirects';
import supabase from '@/lib/db/client';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleResetRequest() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        // The configured Site URL is always an authorized Supabase destination.
        // The root route forwards the returned PKCE code to the callback before
        // rendering the landing page.
        redirectTo: `${resolveAuthSiteUrl()}/`,
      },
    );

    setLoading(false);

    if (resetError) {
      setError('We could not send a reset email right now. Please wait a moment and try again.');
      return;
    }

    // Keep this response generic so the screen never reveals whether an account
    // exists for the submitted address.
    setSubmitted(true);
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
            Reset your password
          </Text>
          <Typography variant="body" className="mb-10">
            Enter the email you use for Ohara and we&apos;ll send you a secure reset link.
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

          {submitted ? (
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
                If an Ohara account exists for {email.trim()}, a password reset link is on its way. Check your spam folder too.
              </Text>
            </View>
          ) : (
            <>
              <Typography variant="field-label" className="mb-1.5">
                Email
              </Typography>
              <TextInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="email"
                className="rounded-2xl px-4 py-3.5 text-base mb-6"
                keyboardType="email-address"
                onChangeText={setEmail}
                onSubmitEditing={handleResetRequest}
                placeholder="you@example.com"
                placeholderTextColor={LIGHT_THEME.text.muted}
                returnKeyType="send"
                style={{
                  backgroundColor: LIGHT_THEME.background.input,
                  borderColor: LIGHT_THEME.border.input,
                  borderWidth: 1,
                  color: LIGHT_THEME.text.primary,
                }}
                value={email}
              />

              <TouchableOpacity
                accessibilityRole="button"
                className="rounded-full py-4 items-center mb-6"
                disabled={loading}
                onPress={handleResetRequest}
                style={{
                  backgroundColor: LIGHT_THEME.accent.primary,
                  opacity: loading ? 0.65 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={LIGHT_THEME.text.onAccent} />
                ) : (
                  <Text
                    className="text-base"
                    style={{
                      color: LIGHT_THEME.text.onAccent,
                      fontFamily: 'Inter-SemiBold',
                    }}
                  >
                    Send reset link
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

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
        </View>
      </ScrollView>
    </View>
  );
}
