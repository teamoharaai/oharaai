import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import { authedFetch, signOutAndRedirect } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/contracts';
import { Avatar } from '@/components/ui/Avatar';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { FEATURES } from '@/constants/features';
import {
  FriendsPopover,
  shouldUseDesktopFriendsPopover,
  type FriendsAnchorRect,
} from '@/features/friends/components/FriendsPopover';
import type { FriendsTab } from '@/features/friends/components/types';
import { useAuthStore } from '@/features/auth/store';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { AccountModal } from './AccountModal';
import { SettingsModal } from './SettingsModal';

interface ProfileApiSummary {
  display_name: string;
  username: string;
  avatar_url: string | null;
}

type ProfileSummary = ProfileApiSummary;

function MenuRow({
  danger = false,
  label,
  onPress,
}: {
  danger?: boolean;
  label: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.background.selectedRow : 'transparent',
        borderRadius: 10,
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 10,
      })}
    >
      <Text
        style={{
          color: danger ? colors.feedback.danger.text : colors.text.primary,
          fontFamily: 'Inter-Regular',
          fontSize: 15,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AvatarMenu() {
  const colors = useThemeColors();
  const themeMode = useUIStore((state) => state.themeMode);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const activeUserId = useAuthStore((state) => state.session?.user.id ?? null);
  const metadataUsername = useAuthStore((state) => {
    const value = state.session?.user.user_metadata.username;
    return typeof value === 'string' ? value : '';
  });
  const { width: viewportWidth } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsTab, setFriendsTab] = useState<FriendsTab>('friends');
  const [anchorRect, setAnchorRect] =
    useState<FriendsAnchorRect | null>(null);
  const triggerRef = useRef<View | null>(null);
  const avatarAnchorRef = useRef<View | null>(null);

  useEffect(() => {
    setMenuOpen(false);
    setFriendsOpen(false);
    setAccountOpen(false);
    setSettingsOpen(false);
    setAnchorRect(null);
    setFriendsTab('friends');
  }, [activeUserId]);

  useEffect(() => {
    let active = true;
    setProfile(null);
    if (!activeUserId) return () => {
      active = false;
    };

    async function load() {
      try {
        const res = await authedFetch('/api/profile');
        if (!active) return;
        const body = (await res.json()) as ApiResponse<ProfileApiSummary>;
        if (active && body.ok) {
          setProfile({
            display_name: body.data.display_name,
            avatar_url: body.data.avatar_url,
            username: body.data.username,
          });
        }
      } catch {
        // Silent — avatar falls back to initials/empty. Non-blocking, matches
        // the rest of the app's "never let a profile fetch block chrome" convention.
        // (A genuinely expired/invalid session still redirects to login via
        // authedFetch — this only swallows network/other failures.)
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [activeUserId, metadataUsername]);

  async function handleSignOut() {
    setMenuOpen(false);
    setFriendsOpen(false);
    // RN's core Image component (in use here — expo-image is not installed) has
    // no cross-platform cache-clear API, unlike expo-image's clearDiskCache/
    // clearMemoryCache. Nothing to call. Flagged in OUTSTANDING.md.
    await signOutAndRedirect();
  }

  const displayName = profile?.display_name ?? '';
  const avatarUrl = profile?.avatar_url ?? null;
  const username = profile?.username ?? metadataUsername;
  const useDesktopFriends =
    FEATURES.SOCIAL_ENABLED &&
    shouldUseDesktopFriendsPopover(viewportWidth);

  const restoreTriggerFocus = useCallback(() => {
    const focus = () => {
      const node = triggerRef.current as
        | (View & { focus?: () => void })
        | null;
      node?.focus?.();
    };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(focus);
    } else {
      setTimeout(focus, 0);
    }
  }, []);

  const closeFriends = useCallback(() => {
    setFriendsOpen(false);
    restoreTriggerFocus();
  }, [restoreTriggerFocus]);

  function makeAnchorRect(
    x: number,
    y: number,
    width: number,
    height: number,
  ): FriendsAnchorRect {
    return {
      x,
      y,
      width,
      height,
      top: y,
      left: x,
      right: x + width,
      bottom: y + height,
    };
  }

  function openFromAvatar(event: GestureResponderEvent) {
    if (!useDesktopFriends) {
      setMenuOpen(true);
      return;
    }

    const anchorNode = avatarAnchorRef.current as
      | (View & {
          measureInWindow?: (
            callback: (
              x: number,
              y: number,
              width: number,
              height: number,
            ) => void,
          ) => void;
        })
      | null;
    if (anchorNode?.measureInWindow) {
      anchorNode.measureInWindow((x, y, width, height) => {
        setAnchorRect(makeAnchorRect(x, y, width, height));
        setFriendsOpen(true);
      });
      return;
    }

    const currentTarget = (
      event as GestureResponderEvent & {
        currentTarget?: { getBoundingClientRect?: () => DOMRect };
      }
    ).currentTarget;
    const rect = currentTarget?.getBoundingClientRect?.();
    setAnchorRect(
      rect
        ? makeAnchorRect(rect.left, rect.top, rect.width, rect.height)
        : null,
    );
    setFriendsOpen(true);
  }

  return (
    <>
      <Pressable
        ref={triggerRef}
        accessibilityLabel="Open account and friends"
        accessibilityRole="button"
        accessibilityState={{ expanded: menuOpen || friendsOpen }}
        onPress={openFromAvatar}
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
        <View collapsable={false} ref={avatarAnchorRef}>
          <Avatar avatarUrl={avatarUrl} displayName={displayName} size={36} />
        </View>
      </Pressable>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
          onPress={() => setMenuOpen(false)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.background.card,
              borderColor: colors.border.divider,
              borderWidth: 1,
              borderRadius: 16,
              padding: 20,
              width: '100%',
              maxWidth: 300,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <Avatar avatarUrl={avatarUrl} displayName={displayName} size={44} />
                <Text
                  style={{
                    marginLeft: 12,
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 15,
                    color: colors.text.primary,
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                >
                  {displayName || 'Your account'}
                </Text>
              </View>

              <Pressable
                onPress={toggleTheme}
                accessibilityRole="button"
                accessibilityLabel={
                  themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
                }
                accessibilityHint="Changes the app appearance"
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  marginLeft: 12,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed
                    ? colors.background.selectedRow
                    : colors.background.input,
                  borderWidth: 1,
                  borderColor: colors.border.divider,
                })}
              >
                <BrandIcon
                  name="theme-mode"
                  size={36}
                  tintColor={themeMode === 'light' ? colors.text.primary : undefined}
                />
              </Pressable>
            </View>

            <MenuRow
              label="Profile"
              onPress={() => {
                setMenuOpen(false);
                setAccountOpen(true);
              }}
            />

            <MenuRow
              label="Settings"
              onPress={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
            />

            <View style={{ height: 1, backgroundColor: colors.border.divider, marginVertical: 4 }} />

            <MenuRow danger label="Log out" onPress={() => void handleSignOut()} />
          </Pressable>
        </Pressable>
      </Modal>

      <AccountModal
        visible={accountOpen}
        onClose={() => setAccountOpen(false)}
        onSaved={setProfile}
      />

      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {FEATURES.SOCIAL_ENABLED ? (
        <FriendsPopover
          key={activeUserId ?? 'signed-out'}
          anchorRect={anchorRect}
          onChangeTab={setFriendsTab}
          onClose={closeFriends}
          onLogOut={() => void handleSignOut()}
          onOpenAccount={() => {
            setFriendsOpen(false);
            setAccountOpen(true);
          }}
          profile={{
            avatarUrl,
            displayName,
            username,
          }}
          tab={friendsTab}
          visible={friendsOpen}
        />
      ) : null}
    </>
  );
}
