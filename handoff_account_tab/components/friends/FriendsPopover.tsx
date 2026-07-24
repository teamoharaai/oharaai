// Desktop-only Friends popover — anchored to the sidebar avatar.
//
// This is the same layout as turn 3 of Account Friends v2.dc.html: a 240px
// left rail (profile + stat + tabs + settings) and a ~480px right pane whose
// contents come from FriendsListPane / RequestsPane / AddPeoplePane.
//
// Positioning uses a raw RN <Modal> with a transparent overlay so the popover
// can sit next to its trigger rather than centered on screen. The visible
// surface is our themed <View> inside that overlay — nothing about the shared
// Modal component changes.
//
// The trigger (the sidebar avatar Pressable) passes an anchor rect via the
// `anchor` prop; on close, focus returns to the trigger. On mobile / narrow
// windows the popover renders null and the existing AvatarMenu dropdown is
// used instead — see AvatarMenu.diff.md for the branching.

import { useEffect, useMemo, useRef } from 'react';
import {
  Dimensions,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { signOutAndRedirect } from '@/lib/api/client';
import { useFriendsStore } from '@/features/friends/store';
import type { FriendsTab } from '@/features/friends/types';
import { RailButton } from './RailButton';
import { StatCell } from './StatCell';
import { FriendsListPane } from './FriendsListPane';
import { RequestsPane } from './RequestsPane';
import { AddPeoplePane } from './AddPeoplePane';

// Sole anchor contract with the trigger: a screen-space rect. AvatarMenu
// measures its own Pressable and passes this in.
export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FriendsPopoverProps {
  visible: boolean;
  onClose: () => void;
  anchor: AnchorRect | null;
  profile: { display_name: string; avatar_url: string | null };
  activeGoalCount?: number;
  tab: FriendsTab;
  onChangeTab: (tab: FriendsTab) => void;
  onOpenProfileSettings: () => void;
  onOpenSettings: () => void;
}

const POPOVER_WIDTH = 720;
const POPOVER_HEIGHT = 560;
const RAIL_WIDTH = 240;
const ANCHOR_GAP = 12;

/**
 * Renders anywhere except: not-web, or window width < 900px. Callers should
 * check the same conditions and fall back to the existing dropdown menu.
 */
export function shouldUseDesktopFriendsPopover(width: number): boolean {
  return Platform.OS === 'web' && width >= 900;
}

export function FriendsPopover({
  visible,
  onClose,
  anchor,
  profile,
  activeGoalCount = 0,
  tab,
  onChangeTab,
  onOpenProfileSettings,
  onOpenSettings,
}: FriendsPopoverProps) {
  const colors = useThemeColors();
  const themeMode = useUIStore((s) => s.themeMode);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const { width: winWidth, height: winHeight } = useWindowDimensions();

  const hydrate = useFriendsStore((s) => s.hydrate);
  const friendCount = useFriendsStore((s) => s.friend_count);
  const requestCount = useFriendsStore((s) => s.incoming_requests.length);
  const sentCount = useFriendsStore((s) => s.sent_requests.length);
  const loadError = useFriendsStore((s) => s.loadError);

  // Hydrate whenever the popover opens; the store caches so re-open is instant.
  useEffect(() => {
    if (visible) void hydrate();
  }, [visible, hydrate]);

  // Escape closes.
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  const position = useMemo<ViewStyle>(() => {
    // Placed to the right of the sidebar avatar, popping upward so its bottom
    // sits ~level with the avatar. Clamped to the viewport with an 8px gutter.
    if (!anchor) {
      return {
        left: Math.max(8, (winWidth - POPOVER_WIDTH) / 2),
        top: Math.max(8, (winHeight - POPOVER_HEIGHT) / 2),
      };
    }
    const left = Math.min(
      Math.max(8, anchor.x + anchor.width + ANCHOR_GAP),
      winWidth - POPOVER_WIDTH - 8,
    );
    const top = Math.min(
      Math.max(8, anchor.y + anchor.height / 2 - POPOVER_HEIGHT + 32),
      winHeight - POPOVER_HEIGHT - 8,
    );
    return { left, top };
  }, [anchor, winWidth, winHeight]);

  if (!shouldUseDesktopFriendsPopover(winWidth)) return null;

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(30,32,28,0.25)' }}
        accessibilityLabel="Close friends menu"
      >
        <Pressable
          onPress={() => {}}
          accessibilityRole="none"
          style={[
            {
              position: 'absolute',
              width: POPOVER_WIDTH,
              height: POPOVER_HEIGHT,
              flexDirection: 'row',
              borderRadius: 20,
              overflow: 'hidden',
              backgroundColor: colors.background.card,
              borderWidth: 1,
              borderColor: colors.border.warm,
              shadowColor: '#1E3226',
              shadowOffset: { width: 0, height: 24 },
              shadowOpacity: 0.22,
              shadowRadius: 64,
              elevation: 24,
            },
            position,
          ]}
        >
          {/* ─── Left rail ─── */}
          <View
            style={{
              width: RAIL_WIDTH,
              paddingHorizontal: 18,
              paddingVertical: 22,
              backgroundColor: colors.background.goalCard,
              borderRightWidth: 1,
              borderColor: colors.border.warmSubtle,
            }}
          >
            <Pressable
              onPress={onOpenProfileSettings}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderColor: colors.border.warmSubtle,
              }}
            >
              <Avatar
                avatarUrl={profile.avatar_url}
                displayName={profile.display_name}
                size={44}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Typography variant="card-title" numberOfLines={1}>
                  {profile.display_name || 'Your account'}
                </Typography>
                <Typography variant="meta" numberOfLines={1} style={{ marginTop: 2 }}>
                  Free plan
                </Typography>
              </View>
            </Pressable>

            <View
              style={{
                flexDirection: 'row',
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: colors.border.warmSubtle,
              }}
            >
              <StatCell value={friendCount} label="Friends" />
              <StatCell value={activeGoalCount} label="Active goals" />
              <StatCell value={sentCount} label="Sent" />
            </View>

            <View style={{ paddingVertical: 14, flex: 1 }}>
              <Typography
                variant="section-eyebrow"
                style={{ paddingHorizontal: 6, paddingBottom: 8, color: colors.text.muted }}
              >
                Friends
              </Typography>
              <RailButton
                icon={<RailIcon name="friends" color={tab === 'friends' ? colors.accent.primary : colors.text.muted} />}
                label="Friends"
                count={friendCount}
                active={tab === 'friends'}
                onPress={() => onChangeTab('friends')}
              />
              <RailButton
                icon={<RailIcon name="requests" color={tab === 'requests' ? colors.accent.primary : colors.text.muted} />}
                label="Requests"
                badgeCount={requestCount}
                active={tab === 'requests'}
                onPress={() => onChangeTab('requests')}
              />
              <RailButton
                icon={<RailIcon name="add" color={tab === 'add' ? colors.accent.primary : colors.text.muted} />}
                label="Add people"
                active={tab === 'add'}
                onPress={() => onChangeTab('add')}
              />
            </View>

            <View
              style={{
                paddingTop: 10,
                borderTopWidth: 1,
                borderColor: colors.border.warmSubtle,
                gap: 2,
              }}
            >
              <RailButton
                icon={<RailIcon name="moon" color={colors.text.muted} />}
                label="Dark mode"
                active={false}
                onPress={toggleTheme}
                trailing={
                  <View
                    style={{
                      marginLeft: 'auto',
                      width: 30,
                      height: 18,
                      borderRadius: 999,
                      backgroundColor: colors.accent.tealSubtle,
                      padding: 2,
                      alignItems: themeMode === 'dark' ? 'flex-end' : 'flex-start',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 999,
                        backgroundColor: colors.background.card,
                      }}
                    />
                  </View>
                }
              />
              <RailButton
                icon={<RailIcon name="settings" color={colors.text.muted} />}
                label="Settings"
                onPress={onOpenSettings}
              />
              <RailButton
                icon={<RailIcon name="logout" color={colors.feedback.danger.text} />}
                label="Log out"
                danger
                onPress={() => void signOutAndRedirect()}
              />
            </View>
          </View>

          {/* ─── Right pane ─── */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <PaneHeader tab={tab} requestCount={requestCount} friendCount={friendCount} onClose={onClose} />
            <ScrollView contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 20 }}>
              {loadError ? (
                <View style={{ padding: 20 }}>
                  <Typography variant="meta" style={{ color: colors.feedback.danger.text }}>
                    {loadError}
                  </Typography>
                </View>
              ) : tab === 'friends' ? (
                <FriendsListPane onOpenProfile={(id) => router.push(`/profile/${id}`)} />
              ) : tab === 'requests' ? (
                <RequestsPane />
              ) : (
                <AddPeoplePane />
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

function PaneHeader({
  tab,
  requestCount,
  friendCount,
  onClose,
}: {
  tab: FriendsTab;
  requestCount: number;
  friendCount: number;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const title =
    tab === 'friends' ? 'My friends' : tab === 'requests' ? 'Requests' : 'Add people';
  const subtitle =
    tab === 'friends'
      ? `${friendCount} · Private — only you see this list.`
      : tab === 'requests'
        ? requestCount === 1
          ? '1 person wants to connect with you.'
          : `${requestCount} people want to connect with you.`
        : 'Ohara has no directory — search matches exact and beginning-of-username only.';

  return (
    <View
      style={{
        paddingHorizontal: 28,
        paddingTop: 22,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        borderBottomWidth: 1,
        borderColor: colors.border.warmSubtle,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Typography variant="heading" style={{ fontSize: 20, color: colors.text.primary }}>
          {title}
        </Typography>
        <Typography variant="meta" numberOfLines={1} style={{ color: colors.text.muted, marginTop: 3 }}>
          {subtitle}
        </Typography>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        style={({ pressed }) => ({
          width: 32,
          height: 32,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border.warm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.background.input : 'transparent',
        })}
      >
        <Typography variant="meta" style={{ color: colors.text.secondary, fontSize: 15 }}>×</Typography>
      </Pressable>
    </View>
  );
}

// Tiny inline icon-set placeholder so this component ships without a new asset
// dependency. Swap for <BrandIcon> from your existing set once slugs exist.
function RailIcon({ name, color }: { name: string; color: string }) {
  const glyph =
    name === 'friends' ? '◐' : name === 'requests' ? '✉' : name === 'add' ? '⌕'
    : name === 'moon' ? '☾' : name === 'settings' ? '⚙' : '⏻';
  return <Typography variant="micro-label" style={{ color, fontSize: 14 }}>{glyph}</Typography>;
}
