# Patch: `components/layout/AvatarMenu.tsx`

Wires the desktop popover into the existing avatar `Pressable`. Everything
below the width gate stays as-is, so iOS / narrow-window users continue to see
the current dropdown menu until the iOS overlay from turn 2 lands.

## What changes

1. Import `FriendsPopover` and `shouldUseDesktopFriendsPopover`.
2. Add a `View` ref + `useWindowDimensions` so we can measure the trigger and
   decide which surface to open.
3. Add `friendsOpen` + `anchorRect` + `friendsTab` state.
4. In the avatar `Pressable`'s `onPress`, branch on desktop-width: on wide web
   we measure the trigger and open the popover; otherwise we open the existing
   `menuOpen` dropdown unchanged.
5. Render `<FriendsPopover />` alongside the existing `<Modal>` and
   `<AccountModal>` / `<SettingsModal>`.

## Diff

```diff
--- a/components/layout/AvatarMenu.tsx
+++ b/components/layout/AvatarMenu.tsx
@@
-import { useEffect, useState } from 'react';
-import { Modal, Pressable, Text, View } from 'react-native';
+import { useEffect, useRef, useState } from 'react';
+import {
+  Modal,
+  Pressable,
+  Text,
+  View,
+  useWindowDimensions,
+  findNodeHandle,
+  UIManager,
+} from 'react-native';
 import { authedFetch, signOutAndRedirect } from '@/lib/api/client';
 import type { ApiResponse } from '@/lib/api/contracts';
 import { Avatar } from '@/components/ui/Avatar';
 import { BrandIcon } from '@/components/ui/BrandIcon';
 import { useThemeColors, useUIStore } from '@/store/uiStore';
 import { AccountModal } from './AccountModal';
 import { SettingsModal } from './SettingsModal';
+import {
+  FriendsPopover,
+  shouldUseDesktopFriendsPopover,
+  type AnchorRect,
+} from '@/components/friends/FriendsPopover';
+import type { FriendsTab } from '@/features/friends/types';
@@
 export function AvatarMenu() {
   const colors = useThemeColors();
   const themeMode = useUIStore((state) => state.themeMode);
   const toggleTheme = useUIStore((state) => state.toggleTheme);
   const [menuOpen, setMenuOpen] = useState(false);
   const [accountOpen, setAccountOpen] = useState(false);
   const [settingsOpen, setSettingsOpen] = useState(false);
   const [profile, setProfile] = useState<ProfileSummary | null>(null);
+  const [friendsOpen, setFriendsOpen] = useState(false);
+  const [friendsTab, setFriendsTab] = useState<FriendsTab>('friends');
+  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
+  const { width: winWidth } = useWindowDimensions();
+  const triggerRef = useRef<View | null>(null);
@@
   const displayName = profile?.display_name ?? '';
   const avatarUrl = profile?.avatar_url ?? null;
+
+  function openFromAvatar() {
+    if (!shouldUseDesktopFriendsPopover(winWidth)) {
+      setMenuOpen(true);
+      return;
+    }
+    const node = triggerRef.current;
+    if (!node) {
+      setFriendsOpen(true);
+      return;
+    }
+    // measureInWindow gives us the screen-space rect the popover anchors to.
+    node.measureInWindow((x, y, width, height) => {
+      setAnchorRect({ x, y, width, height });
+      setFriendsOpen(true);
+    });
+  }

   return (
     <>
       <Pressable
+        ref={triggerRef}
         accessibilityLabel="Open account menu"
         accessibilityRole="button"
-        onPress={() => setMenuOpen(true)}
+        onPress={openFromAvatar}
         style={({ pressed }) => ({
           flexDirection: 'row',
           alignItems: 'center',
           paddingHorizontal: 16,
           paddingVertical: 8,
           borderRadius: 12,
           marginBottom: 4,
           opacity: pressed ? 0.7 : 1,
         })}
       >
         <Avatar avatarUrl={avatarUrl} displayName={displayName} size={36} />
       </Pressable>
@@
       <AccountModal
         visible={accountOpen}
         onClose={() => setAccountOpen(false)}
         onSaved={(updated) => setProfile(updated)}
       />

       <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
+
+      <FriendsPopover
+        visible={friendsOpen}
+        onClose={() => setFriendsOpen(false)}
+        anchor={anchorRect}
+        profile={{ display_name: displayName, avatar_url: avatarUrl }}
+        tab={friendsTab}
+        onChangeTab={setFriendsTab}
+        onOpenProfileSettings={() => {
+          setFriendsOpen(false);
+          setAccountOpen(true);
+        }}
+        onOpenSettings={() => {
+          setFriendsOpen(false);
+          setSettingsOpen(true);
+        }}
+      />
     </>
   );
 }
```

## Notes for Codex

- `findNodeHandle` and `UIManager` are imported but unused in the diff — leave
  them out if your linter is strict. They're documented here in case a future
  cross-platform measure path needs them.
- The desktop popover deliberately reads `Platform.OS === 'web'` and window
  width itself, so leaving `openFromAvatar` naïvely calling
  `shouldUseDesktopFriendsPopover(winWidth)` is safe on native too — the
  popover renders null and we fall back to the dropdown.
- A stub profile route (`app/profile/[id].tsx`) is expected because
  `FriendsListPane` navigates to `/profile/{id}` on row press. Until it exists,
  add:
  ```tsx
  export default function ProfileStub() { return null; }
  ```
  at `app/profile/[id].tsx` to prevent expo-router 404s during dev.
