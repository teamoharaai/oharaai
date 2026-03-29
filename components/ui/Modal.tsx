import { Modal as RNModal, View, TouchableOpacity, Text } from 'react-native';
import type { ReactNode } from 'react';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ visible, onClose, children }: ModalProps) {
  return (
    <RNModal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-cream rounded-2xl p-6 w-full max-w-sm">
          {children}
          <TouchableOpacity className="mt-4 items-center" onPress={onClose}>
            <Text className="text-muted text-sm">Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </RNModal>
  );
}
