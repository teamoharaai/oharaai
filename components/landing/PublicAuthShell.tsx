import type { ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { BrandArtwork } from '@/components/landing/BrandArtwork';
import {
  PublicHeader,
  PublicPageCanvas,
  PUBLIC_COLORS,
} from '@/components/landing/PublicPrimitives';
import { Typography } from '@/components/ui/Typography';

export function PublicAuthShell({
  children,
  mode,
  title,
  subtitle,
}: {
  children: ReactNode;
  mode: 'login' | 'signup';
  title: string;
  subtitle: string;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  return (
    <PublicPageCanvas>
      <PublicHeader mode={mode} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: compact ? 680 : 760, overflow: 'hidden', paddingHorizontal: 20, paddingVertical: 56, position: 'relative' }}>
          <BrandArtwork opacity={compact ? 0.045 : 0.07} rotation={-10} style={{ height: 560, left: -190, position: 'absolute', top: 70, width: 560 }} variant="branch" />
          <BrandArtwork opacity={compact ? 0.04 : 0.065} rotation={180} style={{ bottom: -170, height: 530, position: 'absolute', right: -170, width: 530 }} variant="vein" />
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,.96)',
              borderColor: PUBLIC_COLORS.border,
              borderRadius: 24,
              borderWidth: 1,
              maxWidth: 480,
              padding: compact ? 26 : 38,
              shadowColor: PUBLIC_COLORS.ink,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.06,
              shadowRadius: 30,
              width: '100%',
            }}
          >
            <Typography className="font-inter-semibold" style={{ color: PUBLIC_COLORS.forest, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
              OHARA
            </Typography>
            <Typography className="font-inter-medium" style={{ color: PUBLIC_COLORS.ink, fontSize: 34, letterSpacing: -1, lineHeight: 41, marginTop: 14 }}>
              {title}
            </Typography>
            <Typography style={{ color: PUBLIC_COLORS.muted, fontSize: 15, lineHeight: 23, marginBottom: 30, marginTop: 8 }}>
              {subtitle}
            </Typography>
            {children}
          </View>
        </View>
      </ScrollView>
    </PublicPageCanvas>
  );
}

export const publicInputStyle = {
  backgroundColor: PUBLIC_COLORS.surfaceSoft,
  borderColor: PUBLIC_COLORS.divider,
  borderRadius: 13,
  borderWidth: 1,
  color: PUBLIC_COLORS.ink,
  fontFamily: 'Inter-Regular',
  fontSize: 15,
  minHeight: 50,
  paddingHorizontal: 15,
  paddingVertical: 13,
} as const;
