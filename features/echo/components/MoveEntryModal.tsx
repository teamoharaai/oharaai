import { ActivityIndicator, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import type { EchoFolder } from '@/types/echo-folder';
import type { EntryContainer } from '../services/echo-service';
import type { MoveTargetOption } from '../hooks/useMoveEntry';

interface MoveEntryModalProps {
  visible: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  goals: Array<{ id: string; title: string }>;
  folders: EchoFolder[];
  currentContainer: EntryContainer | null;
  onClose: () => void;
  onConfirm: (target: MoveTargetOption) => void;
}

type MoveListItem =
  | { kind: 'header'; label: string }
  | { kind: 'goal'; id: string; title: string }
  | { kind: 'folder'; id: string; title: string };

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
  const isSelected = (kind: 'goal' | 'folder', id: string) =>
    currentContainer?.type === kind && currentContainer.id === id;

  const listItems: MoveListItem[] = [
    { kind: 'header', label: 'Projects' },
    ...goals.map((goal): MoveListItem => ({ kind: 'goal', id: goal.id, title: goal.title })),
    { kind: 'header', label: 'Echo Folders' },
    ...folders.map((folder): MoveListItem => ({ kind: 'folder', id: folder.id, title: folder.name })),
  ];

  // Block dismissal while a move is in flight so the user can't close (or
  // hardware-back out of) the modal mid-request and miss the outcome.
  const handleDismiss = () => {
    if (!isSaving) onClose();
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
            <FlatList
              data={listItems}
              keyExtractor={(item, index) =>
                item.kind === 'header' ? `header-${item.label}` : `${item.kind}-${item.id}-${index}`
              }
              renderItem={({ item }) => {
                if (item.kind === 'header') {
                  return (
                    <Text className="px-5 pb-2 pt-4 font-sans text-xs font-semibold uppercase tracking-[1.2px] text-[#8A8172]">
                      {item.label}
                    </Text>
                  );
                }

                const selected = isSelected(item.kind, item.id);
                return (
                  <Pressable
                    disabled={isSaving}
                    onPress={() =>
                      !isSaving && onConfirm({ type: item.kind, id: item.id, title: item.title })
                    }
                    className={`flex-row items-center justify-between border-b border-[#D8D2C8] px-5 py-3.5 ${
                      selected ? 'bg-[#EEF2EF]' : ''
                    } ${isSaving ? 'opacity-40' : ''}`}
                  >
                    <Text className="font-sans text-base text-near-black">{item.title}</Text>
                    {selected ? (
                      <Text className="font-sans text-base text-[#1E3226]">{'✓'}</Text>
                    ) : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Typography variant="subtitle" className="px-5 py-4">
                  No projects or folders yet.
                </Typography>
              }
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
