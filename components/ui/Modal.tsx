import {
  Animated,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useThemeColors } from '@/store/uiStore';

interface ModalMotion {
  backdropDuration: number;
  backdropEasing: (value: number) => number;
  contentDuration: number;
  initialTranslateY: number;
  contentEasing: (value: number) => number;
}

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  showCloseButton?: boolean;
  closeDisabled?: boolean;
  cancelText?: string;
  onCancel?: () => void;
  cancelDisabled?: boolean;
  confirmText?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  confirmVariant?: 'default' | 'destructive';
  backdropColor?: string;
  closeOnBackdropPress?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  motion?: ModalMotion;
}

export function Modal({
  visible,
  onClose,
  children,
  showCloseButton = true,
  closeDisabled = false,
  cancelText,
  onCancel,
  cancelDisabled = false,
  confirmText,
  onConfirm,
  confirmDisabled = false,
  confirmVariant = 'default',
  backdropColor = 'rgba(0,0,0,0.5)',
  closeOnBackdropPress = false,
  contentStyle,
  motion,
}: ModalProps) {
  const colors = useThemeColors();
  const hasFooterActions = !!cancelText || !!confirmText || !!onCancel || !!onConfirm;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || !motion) return;

    backdropOpacity.setValue(0);
    contentOpacity.setValue(0);
    contentTranslateY.setValue(motion.initialTranslateY);

    const entranceAnimation = Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: motion.backdropDuration,
        easing: motion.backdropEasing,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: motion.contentDuration,
        easing: motion.contentEasing,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: motion.contentDuration,
        easing: motion.contentEasing,
        useNativeDriver: true,
      }),
    ]);

    entranceAnimation.start();
    return () => entranceAnimation.stop();
  }, [
    backdropOpacity,
    contentOpacity,
    contentTranslateY,
    motion,
    visible,
  ]);

  function handleClose() {
    if (closeDisabled) return;
    onClose();
  }

  function handleCancel() {
    if (closeDisabled || cancelDisabled) return;
    if (onCancel) {
      onCancel();
      return;
    }
    onClose();
  }

  const modalContent = (
    <>
      {children}

      {hasFooterActions ? (
        <View className="mt-5 flex-row justify-end gap-3">
          {cancelText ? (
            <TouchableOpacity
              className={`rounded-xl px-4 py-3 ${closeDisabled || cancelDisabled ? 'opacity-60' : ''}`}
              style={{ backgroundColor: colors.background.input }}
              onPress={handleCancel}
              disabled={closeDisabled || cancelDisabled}
            >
              <Text
                className="text-sm font-inter-medium"
                style={{ color: colors.text.secondary }}
              >
                {cancelText}
              </Text>
            </TouchableOpacity>
          ) : null}

          {confirmText ? (
            <TouchableOpacity
              className={`rounded-xl px-4 py-3 ${confirmDisabled ? 'opacity-60' : ''}`}
              style={{
                backgroundColor:
                  confirmVariant === 'destructive'
                    ? colors.feedback.danger.text
                    : colors.accent.primary,
              }}
              onPress={onConfirm}
              disabled={confirmDisabled}
            >
              <Text
                className="text-sm font-inter-semibold"
                style={{ color: colors.text.inverse }}
              >
                {confirmText}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {showCloseButton ? (
        <TouchableOpacity className="mt-4 items-center" onPress={handleClose} disabled={closeDisabled}>
          <Text
            className={`text-sm ${closeDisabled ? 'opacity-60' : ''}`}
            style={{ color: colors.text.secondary }}
          >
            Close
          </Text>
        </TouchableOpacity>
      ) : null}
    </>
  );

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={motion ? 'none' : 'fade'}
      onRequestClose={handleClose}
    >
      {motion ? (
        <View style={styles.overlay}>
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor, opacity: backdropOpacity }]}
          />
          {closeOnBackdropPress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              onPress={handleClose}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <Animated.View
            style={[
              styles.content,
              {
                backgroundColor: colors.background.card,
                borderColor: colors.border.divider,
                borderWidth: 1,
              },
              contentStyle,
              { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] },
            ]}
          >
            {modalContent}
          </Animated.View>
        </View>
      ) : (
        <View style={[styles.overlay, { backgroundColor: backdropColor }]}>
          {closeOnBackdropPress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              onPress={handleClose}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View
            style={[
              styles.content,
              {
                backgroundColor: colors.background.card,
                borderColor: colors.border.divider,
                borderWidth: 1,
              },
              contentStyle,
            ]}
          >
            {modalContent}
          </View>
        </View>
      )}
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 384,
    padding: 24,
    borderRadius: 16,
  },
});
