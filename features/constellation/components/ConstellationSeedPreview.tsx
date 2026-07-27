import { View } from 'react-native';
import { useThemeColors } from '@/store/uiStore';
import { Typography } from '@/components/ui/Typography';

interface ConstellationSeedPreviewProps {
  compact?: boolean;
}

export function ConstellationSeedPreview({
  compact = false,
}: ConstellationSeedPreviewProps) {
  const colors = useThemeColors();
  const opacity = compact ? 0.16 : 0.22;

  return (
    <View
      accessibilityLabel="A Season 01 seed surrounded by possible future patterns"
      style={{
        alignSelf: 'center',
        height: compact ? 270 : 500,
        maxWidth: 760,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      <View
        style={{
          alignSelf: 'center',
          borderColor: colors.text.muted,
          borderRadius: 999,
          borderStyle: 'dotted',
          borderWidth: 1,
          height: compact ? 188 : 400,
          opacity: 0.18,
          position: 'absolute',
          top: compact ? 34 : 36,
          width: compact ? 188 : 400,
        }}
      />
      <View
        style={{
          alignSelf: 'center',
          borderColor: colors.text.muted,
          borderRadius: 999,
          borderStyle: 'dotted',
          borderWidth: 1,
          height: compact ? 126 : 240,
          opacity: 0.16,
          position: 'absolute',
          top: compact ? 64 : 116,
          width: compact ? 126 : 240,
        }}
      />

      <View
        style={{
          alignSelf: 'center',
          backgroundColor: colors.accent.primary,
          borderRadius: 999,
          height: compact ? 150 : 220,
          opacity: 0.12,
          position: 'absolute',
          top: compact ? 62 : 140,
          width: compact ? 150 : 220,
        }}
      />
      <View
        style={{
          alignItems: 'center',
          alignSelf: 'center',
          backgroundColor: colors.background.sidebar,
          borderRadius: 999,
          height: compact ? 76 : 104,
          justifyContent: 'center',
          position: 'absolute',
          top: compact ? 100 : 198,
          width: compact ? 76 : 104,
        }}
      >
        <Typography
          variant="section-eyebrow"
          style={{ color: colors.text.onAccent, fontSize: compact ? 9 : 10 }}
        >
          SEASON 01
        </Typography>
        <Typography
          variant="caption"
          style={{ color: colors.text.inverse, marginTop: 4 }}
        >
          this chapter
        </Typography>
      </View>

      <View
        style={{
          backgroundColor: colors.accent.primary,
          height: compact ? 22 : 32,
          left: compact ? '22%' : '20%',
          opacity,
          position: 'absolute',
          top: compact ? 72 : 132,
          transform: [{ rotate: '45deg' }],
          width: compact ? 22 : 32,
        }}
      />
      <View
        style={{
          backgroundColor: colors.accent.primary,
          borderRadius: 999,
          height: compact ? 16 : 24,
          opacity,
          position: 'absolute',
          right: compact ? '14%' : '9%',
          top: compact ? 82 : 150,
          width: compact ? 16 : 24,
        }}
      />
      <View
        style={{
          borderColor: colors.text.muted,
          borderRadius: 999,
          borderWidth: 1,
          bottom: compact ? 32 : 66,
          height: compact ? 18 : 28,
          left: compact ? '18%' : '16%',
          opacity,
          position: 'absolute',
          width: compact ? 18 : 28,
        }}
      />
      <View
        style={{
          borderColor: colors.accent.primary,
          borderRadius: 999,
          borderStyle: 'dashed',
          borderWidth: 1,
          bottom: compact ? 20 : 48,
          height: compact ? 22 : 34,
          opacity,
          position: 'absolute',
          right: compact ? '20%' : '17%',
          width: compact ? 22 : 34,
        }}
      />
    </View>
  );
}
