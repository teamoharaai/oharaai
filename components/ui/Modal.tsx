import { Modal as RNModal, View, TouchableOpacity, Text } from 'react-native';
import type { ReactNode } from 'react';

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
}: ModalProps) {
  const hasFooterActions = !!cancelText || !!confirmText || !!onCancel || !!onConfirm;

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

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-cream rounded-2xl p-6 w-full max-w-sm">
          {children}

          {hasFooterActions ? (
            <View className="mt-5 flex-row justify-end gap-3">
              {cancelText ? (
                <TouchableOpacity
                  className={`rounded-xl bg-[#F5F1EA] px-4 py-3 ${closeDisabled || cancelDisabled ? 'opacity-60' : ''}`}
                  onPress={handleCancel}
                  disabled={closeDisabled || cancelDisabled}
                >
                  <Text className="text-sm font-medium text-[#4B5563]">{cancelText}</Text>
                </TouchableOpacity>
              ) : null}

              {confirmText ? (
                <TouchableOpacity
                  className={`rounded-xl px-4 py-3 ${confirmVariant === 'destructive' ? 'bg-[#DC2626]' : 'bg-[#3D5247]'} ${confirmDisabled ? 'opacity-60' : ''}`}
                  onPress={onConfirm}
                  disabled={confirmDisabled}
                >
                  <Text className="text-sm font-semibold text-white">{confirmText}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {showCloseButton ? (
            <TouchableOpacity className="mt-4 items-center" onPress={handleClose} disabled={closeDisabled}>
              <Text className={`text-muted text-sm ${closeDisabled ? 'opacity-60' : ''}`}>Close</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </RNModal>
  );
}
