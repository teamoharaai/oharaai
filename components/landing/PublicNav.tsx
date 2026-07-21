import { useState } from 'react';
import { Image, Pressable, useWindowDimensions, View } from 'react-native';
import { Link, type Href } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { LIGHT_THEME } from '@/constants/colors';

const LOGO = require('../../assets/brand/ohara-logo.png');

const interactiveStyle = {
  cursor: 'pointer',
  transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
} as const;

function TextLink({ href, label }: { href: Href; label: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={interactiveStyle}
      >
        <Typography
          variant="badge-text"
          style={{
            color: hovered ? LIGHT_THEME.text.accent : LIGHT_THEME.text.secondary,
            fontFamily: 'Inter-Medium',
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {label}
        </Typography>
      </Pressable>
    </Link>
  );
}

export function PublicNav({ compact: compactOverride }: { compact?: boolean }) {
  const { width } = useWindowDimensions();
  const compact = compactOverride ?? width < 760;
  const [signupHovered, setSignupHovered] = useState(false);

  return (
    <View
      style={{
        backgroundColor: LIGHT_THEME.background.page,
        borderBottomColor: LIGHT_THEME.border.divider,
        borderBottomWidth: 1,
        paddingHorizontal: compact ? 20 : 48,
        paddingVertical: 16,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginHorizontal: 'auto',
          maxWidth: 1180,
          width: '100%',
        }}
      >
        <Link href="/" asChild>
          <Pressable
            accessibilityLabel="OharaAI home"
            accessibilityRole="link"
            style={{ ...interactiveStyle, alignItems: 'center', flexDirection: 'row', gap: 10 }}
          >
            <Image
              source={LOGO}
              resizeMode="contain"
              style={{ height: 34, tintColor: LIGHT_THEME.accent.primary, width: 34 }}
            />
            <Typography
              style={{
                color: LIGHT_THEME.text.primary,
                fontFamily: 'Inter-SemiBold',
                fontSize: 14,
                letterSpacing: 3.4,
                lineHeight: 20,
                textTransform: 'uppercase',
              }}
            >
              OharaAI
            </Typography>
          </Pressable>
        </Link>

        <View style={{ alignItems: 'center', flexDirection: 'row', gap: compact ? 14 : 28 }}>
          {!compact ? <TextLink href={'/about' as Href} label="About Us" /> : null}
          <TextLink href="/(auth)/login" label="Log in" />
          <Link href="/(auth)/signup" asChild>
            <Pressable
              accessibilityRole="link"
              onHoverIn={() => setSignupHovered(true)}
              onHoverOut={() => setSignupHovered(false)}
              style={{
                ...interactiveStyle,
                backgroundColor: signupHovered
                  ? LIGHT_THEME.text.accent
                  : LIGHT_THEME.accent.primary,
                borderRadius: 999,
                paddingHorizontal: compact ? 16 : 20,
                paddingVertical: 10,
              }}
            >
              <Typography
                style={{
                  color: LIGHT_THEME.text.onAccent,
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                Sign up
              </Typography>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}
