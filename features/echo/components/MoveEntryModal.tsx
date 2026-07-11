import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import type { EchoFolder } from '@/types/echo-folder';
import type { EntryContainer } from '../services/echo-service';
import type { MoveTargetOption } from '../hooks/useMoveEntry';
import type { EchoGoalOption } from '../types';
import { GoalFolderPicker, type GoalFolderPickerValue } from './GoalFolderPicker';

interface MoveEntryModalProps {
  visible: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  goals: EchoGoalOption[];
  folders: EchoFolder[];
  currentContainer: EntryContainer | null;
  onClose: () => void;
  onConfirm: (target: MoveTargetOption) => void;
}

export function MoveEntryModal({
  visible,
  isLoading,
  isSaving,
  error,
  goals,
  folders,
  currentContainer,
  onClose,
  onConfirm,
}: MoveEntryModalProps) {
  // Block dismissal while a move is in flight so the user can't close (or
  // hardware-back out of) the modal mid-request and miss the outcome.
  const handleDismiss = () => {
    if (!isSaving) onClose();
  };

  const handleSelect = (target: GoalFolderPickerValue) => {
    if (isSaving) return;
    onConfirm({ type: target.type, id: target.id, title: target.displayName });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleDismiss}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={handleDismiss}>
        <Pressable className="max-h-[75%] rounded-t-2xl border-t border-[#D8D2C8] bg-white pb-8 pt-3">
          <View className="mb-4 h-1 w-9 self-center rounded-full bg-[#D8D2C8]" />
          <Text
            className="mb-3 px-5 font-sans text-base text-near-black"
            style={{ fontFamily: 'Inter-Bold' }}
          >
            Move entry
          </Text>

          {isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="small" color="#A79E8E" />
            </View>
          ) : (
            <GoalFolderPicker
              goals={goals}
              folders={folders}
              selected={currentContainer}
              disabled={isSaving}
              onSelect={handleSelect}
            />
          )}

          {error ? (
            <Text className="mt-2 px-5 font-sans text-sm text-red-700">{error}</Text>
          ) : null}

          {isSaving ? (
            <View className="items-center py-3">
              <ActivityIndicator size="small" color="#A79E8E" />
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
