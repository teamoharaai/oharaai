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
              className={`rounded-xl bg-[#F8F4EC] px-4 py-3 ${closeDisabled || cancelDisabled ? 'opacity-60' : ''}`}
              onPress={handleCancel}
              disabled={closeDisabled || cancelDisabled}
            >
              <Text className="text-sm font-inter-medium text-[#4B5563]">{cancelText}</Text>
            </TouchableOpacity>
          ) : null}

          {confirmText ? (
            <TouchableOpacity
              className={`rounded-xl px-4 py-3 ${confirmVariant === 'destructive' ? 'bg-[#DC2626]' : 'bg-[#1E3226]'} ${confirmDisabled ? 'opacity-60' : ''}`}
              onPress={onConfirm}
              disabled={confirmDisabled}
            >
              <Text className="text-sm font-inter-semibold text-white">{confirmText}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {showCloseButton ? (
        <TouchableOpacity className="mt-4 items-center" onPress={handleClose} disabled={closeDisabled}>
          <Text className={`text-muted text-sm ${closeDisabled ? 'opacity-60' : ''}`}>Close</Text>
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
          <View style={[styles.content, contentStyle]}>{modalContent}</View>
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
    backgroundColor: '#F8F4EC',
    borderRadius: 16,
  },
});
