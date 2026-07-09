import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

interface EntryActionMenuProps {
  onMoveToFolder: () => void;
}

// Sits as an absolutely-positioned sibling to the card's own Pressable (not
// nested inside it) so opening the menu never triggers the card's onPress —
// no stopPropagation() needed, and behavior is identical on web and native.
export function EntryActionMenu({ onMoveToFolder }: EntryActionMenuProps) {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setMenuVisible(true)}
        hitSlop={10}
        style={{ position: 'absolute', top: 6, right: 6, padding: 8, zIndex: 1 }}
      >
        <Text style={{ fontSize: 18, lineHeight: 18, color: '#6B7B6E', fontFamily: 'Inter-Bold' }}>
          {'···'}
        </Text>
      </Pressable>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setMenuVisible(false)}
        >
          <Pressable className="rounded-t-2xl border-t border-[#D8D2C8] bg-white pb-10 pt-3">
            <View className="mb-4 h-1 w-9 self-center rounded-full bg-[#D8D2C8]" />
            <Pressable
              onPress={() => {
                setMenuVisible(false);
                onMoveToFolder();
              }}
              className="px-5 py-3.5"
            >
              <Text className="font-sans text-base text-near-black">Move to folder</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
