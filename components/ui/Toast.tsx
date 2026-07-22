import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';

export interface ToastProps {
  message: string;
  onUndo?: () => void;
  visible: boolean;
}

export function Toast({ message, onUndo, visible }: ToastProps) {
  const colors = useThemeColors();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      duration: visible ? 180 : 140,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [progress, visible]);

  return (
    <Animated.View
      accessibilityElementsHidden={!visible}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      importantForAccessibility={visible ? 'yes' : 'no-hide-descendants'}
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.positioner,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: colors.text.primary,
            borderColor: colors.border.default,
          },
        ]}
      >
        <Typography
          numberOfLines={2}
          variant="caption"
          style={[styles.message, { color: colors.background.card }]}
        >
          {message}
        </Typography>

        {onUndo ? (
          <Pressable
            accessibilityLabel="Undo"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onUndo}
            style={({ pressed }) => [styles.undo, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Typography
              variant="emphasis-sm"
              style={{ color: colors.accent.teal }}
            >
              Undo
            </Typography>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  message: {
    flex: 1,
    lineHeight: 18,
  },
  positioner: {
    alignItems: 'center',
    bottom: 24,
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 1000,
  },
  toast: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    maxWidth: 440,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    width: '100%',
  },
  undo: {
    marginLeft: 16,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
});

export default Toast;
