import { useWindowDimensions, View } from 'react-native';

import { PreviewSurface, PUBLIC_COLORS } from '@/components/landing/PublicPrimitives';
import { Typography } from '@/components/ui/Typography';

const SUGGESTIONS = [
  'I want to get back into running.',
  'I want to feel more present with my family.',
  'I want to make real progress on my side project.',
] as const;

export function AIGoalCreationPreview() {
  const { width } = useWindowDimensions();
  const compact = width < 720;

  return (
    <PreviewSurface
      style={{
        backgroundColor: PUBLIC_COLORS.page,
        overflow: 'hidden',
        padding: compact ? 20 : 28,
      }}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View
        style={{
          alignSelf: 'center',
          backgroundColor: PUBLIC_COLORS.surfaceSoft,
          borderColor: PUBLIC_COLORS.border,
          borderRadius: 999,
          borderWidth: 1,
          flexDirection: 'row',
          gap: 4,
          padding: 4,
        }}
      >
        <View style={{ justifyContent: 'center', minHeight: 36, paddingHorizontal: compact ? 11 : 15 }}>
          <Typography className="font-inter-semibold" style={{ color: PUBLIC_COLORS.muted, fontSize: compact ? 11.5 : 13 }}>
            Build it myself
          </Typography>
        </View>
        <View
          style={{
            backgroundColor: PUBLIC_COLORS.forest,
            borderRadius: 999,
            justifyContent: 'center',
            minHeight: 36,
            paddingHorizontal: compact ? 12 : 16,
            shadowColor: PUBLIC_COLORS.ink,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 5,
          }}
        >
          <Typography className="font-inter-semibold" style={{ color: '#F7F4EE', fontSize: compact ? 11.5 : 13 }}>
            ✦ Chat with Echo
          </Typography>
        </View>
      </View>

      <View style={{ alignItems: 'center', marginTop: compact ? 26 : 32 }}>
        <Typography
          className="font-inter-semibold"
          style={{
            color: PUBLIC_COLORS.ink,
            fontSize: compact ? 25 : 30,
            letterSpacing: -0.7,
            lineHeight: compact ? 31 : 36,
            textAlign: 'center',
          }}
        >
          What do you want to work on?
        </Typography>
        <Typography
          style={{
            color: PUBLIC_COLORS.muted,
            fontSize: compact ? 12.5 : 13.5,
            lineHeight: compact ? 19 : 21,
            marginTop: 12,
            maxWidth: 460,
            textAlign: 'center',
          }}
        >
          Tell Echo what has been on your mind. It will help you turn the feeling into a goal that fits your life.
        </Typography>
      </View>

      <View
        style={{
          backgroundColor: PUBLIC_COLORS.surface,
          borderColor: PUBLIC_COLORS.divider,
          borderRadius: 15,
          borderWidth: 1,
          marginTop: compact ? 22 : 27,
          minHeight: compact ? 132 : 148,
          padding: compact ? 14 : 17,
        }}
      >
        <Typography
          style={{
            color: PUBLIC_COLORS.quiet,
            fontSize: compact ? 17 : 20,
            letterSpacing: -0.25,
            lineHeight: compact ? 24 : 28,
          }}
        >
          I want to get back into running—
        </Typography>
        <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto' }}>
          <Typography style={{ color: PUBLIC_COLORS.quiet, fontSize: 11.5, lineHeight: 17 }}>
            Press Enter to send
          </Typography>
          <View
            style={{
              backgroundColor: PUBLIC_COLORS.sage,
              borderRadius: 999,
              paddingHorizontal: 17,
              paddingVertical: 10,
            }}
          >
            <Typography className="font-inter-semibold" style={{ color: PUBLIC_COLORS.ink, fontSize: 12 }}>
              Send →
            </Typography>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 13 }}>
        {SUGGESTIONS.map((suggestion) => (
          <View
            key={suggestion}
            style={{
              backgroundColor: PUBLIC_COLORS.surfaceSoft,
              borderColor: PUBLIC_COLORS.border,
              borderRadius: 999,
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Typography style={{ color: PUBLIC_COLORS.muted, fontSize: compact ? 10.5 : 11.5, lineHeight: 16 }}>
              {suggestion}
            </Typography>
          </View>
        ))}
      </View>
      </View>
    </PreviewSurface>
  );
}
