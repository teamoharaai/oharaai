import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type View as NativeView,
} from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Typography } from '@/components/ui/Typography';
import { SettingsPane } from '@/components/layout/SettingsModal';
import { useFriends } from '@/features/friends/hooks/useFriends';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { AddPeoplePane } from './AddPeoplePane';
import { getFriendErrorCopy } from './copy';
import { FriendsListPane } from './FriendsListPane';
import { RailButton } from './RailButton';
import { RequestsPane } from './RequestsPane';
import { StatCell } from './StatCell';
import type { FriendsTab } from './types';

export interface FriendsAnchorRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
  x: number;
  y: number;
}

interface FriendsPopoverProps {
  anchorRect: FriendsAnchorRect | null;
  onChangeTab: (tab: FriendsTab) => void;
  onClose: () => void;
  onLogOut: () => void;
  onOpenAccount: () => void;
  profile: {
    avatarUrl: string | null;
    displayName: string;
    username: string;
  };
  tab: FriendsTab;
  visible: boolean;
}

const POPOVER_WIDTH = 720;
const POPOVER_HEIGHT = 600;
const RAIL_WIDTH = 240;
const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 12;
const TABS: FriendsTab[] = ['friends', 'requests', 'add'];

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

export function shouldUseDesktopFriendsPopover(width: number): boolean {
  return Platform.OS === 'web' && width >= 900;
}

export function FriendsPopover({
  anchorRect,
  onChangeTab,
  onClose,
  onLogOut,
  onOpenAccount,
  profile,
  tab,
  visible,
}: FriendsPopoverProps) {
  const colors = useThemeColors();
  const themeMode = useUIStore((state) => state.themeMode);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const { height: viewportHeight, width: viewportWidth } =
    useWindowDimensions();
  const friendsController = useFriends();
  const friendsTabRef = useRef<NativeView | null>(null);
  const requestsTabRef = useRef<NativeView | null>(null);
  const addTabRef = useRef<NativeView | null>(null);
  const canUseDesktop = shouldUseDesktopFriendsPopover(viewportWidth);

  const popoverWidth = Math.min(
    POPOVER_WIDTH,
    Math.max(0, viewportWidth - VIEWPORT_MARGIN * 2),
  );
  const popoverHeight = Math.min(
    POPOVER_HEIGHT,
    Math.max(0, viewportHeight - VIEWPORT_MARGIN * 2),
  );

  const position = useMemo(() => {
    const maxLeft = Math.max(
      VIEWPORT_MARGIN,
      viewportWidth - popoverWidth - VIEWPORT_MARGIN,
    );
    const maxTop = Math.max(
      VIEWPORT_MARGIN,
      viewportHeight - popoverHeight - VIEWPORT_MARGIN,
    );
    const preferredLeft = anchorRect
      ? anchorRect.right + ANCHOR_GAP
      : (viewportWidth - popoverWidth) / 2;
    const preferredTop = anchorRect
      ? anchorRect.bottom - popoverHeight + 28
      : (viewportHeight - popoverHeight) / 2;
    const left = clamp(preferredLeft, VIEWPORT_MARGIN, maxLeft);
    const top = clamp(preferredTop, VIEWPORT_MARGIN, maxTop);
    const anchorCenterY = anchorRect
      ? anchorRect.top + anchorRect.height / 2
      : top + popoverHeight - 54;

    return {
      caretTop: clamp(
        anchorCenterY - top - 8,
        18,
        Math.max(18, popoverHeight - 30),
      ),
      left,
      top,
    };
  }, [
    anchorRect,
    popoverHeight,
    popoverWidth,
    viewportHeight,
    viewportWidth,
  ]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, visible]);

  useEffect(() => {
    if (visible && !canUseDesktop) {
      onClose();
    }
  }, [canUseDesktop, onClose, visible]);

  function focusTab(nextTab: FriendsTab): void {
    const ref =
      nextTab === 'friends'
        ? friendsTabRef
        : nextTab === 'requests'
          ? requestsTabRef
          : addTabRef;
    const focus = () => {
      const node = ref.current as (NativeView & { focus?: () => void }) | null;
      node?.focus?.();
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(focus);
    } else {
      setTimeout(focus, 0);
    }
  }

  function selectTab(nextTab: FriendsTab, moveFocus = false): void {
    onChangeTab(nextTab);
    if (moveFocus) focusTab(nextTab);
  }

  function handleTabKeyDown(
    event: KeyboardEvent,
    currentTab: FriendsTab,
  ): void {
    const currentIndex = TABS.indexOf(currentTab);
    let nextIndex: number | null = null;

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = TABS.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    selectTab(TABS[nextIndex]!, true);
  }

  function retrySearch(): void {
    const query = friendsController.searchQuery;
    friendsController.setSearchQuery('');
    friendsController.setSearchQuery(query);
  }

  if (!visible || !canUseDesktop || popoverWidth <= 0 || popoverHeight <= 0) {
    return null;
  }

  const requestCount = friendsController.incomingRequests.length;
  const title =
    tab === 'friends'
      ? 'My friends'
      : tab === 'requests'
        ? 'Requests'
        : tab === 'add'
          ? 'Add people'
          : 'Settings';
  const subtitle =
    tab === 'friends'
      ? `${friendsController.friendCount} ${
          friendsController.friendCount === 1 ? 'friend' : 'friends'
        } · Only you see this list.`
      : tab === 'requests'
        ? requestCount === 1
          ? '1 person wants to connect with you.'
          : `${requestCount} people want to connect with you.`
        : tab === 'add'
          ? 'Search by the beginning of an @username.'
          : 'Manage your app preferences and archived goals.';
  const isUnhydratedError =
    !!friendsController.loadError && !friendsController.hasHydrated;
  const refreshError =
    friendsController.loadError && friendsController.hasHydrated
      ? getFriendErrorCopy(
          friendsController.loadError,
          'Could not refresh friends.',
        )
      : null;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.effects.overlay },
          ]}
        />
        <Pressable
          accessible={false}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <View
          accessibilityViewIsModal
          style={{
            height: popoverHeight,
            left: position.left,
            position: 'absolute',
            top: position.top,
            width: popoverWidth,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              backgroundColor: colors.background.goalCard,
              borderBottomColor: colors.border.warm,
              borderBottomWidth: 1,
              borderLeftColor: colors.border.warm,
              borderLeftWidth: 1,
              height: 16,
              left: -7,
              position: 'absolute',
              top: position.caretTop,
              transform: [{ rotate: '45deg' }],
              width: 16,
              zIndex: 2,
            }}
          />

          <View
            style={{
              backgroundColor: colors.background.card,
              borderColor: colors.border.warm,
              borderRadius: 20,
              borderWidth: 1,
              elevation: 24,
              flex: 1,
              flexDirection: 'row',
              overflow: 'hidden',
              shadowColor: colors.effects.shadow,
              shadowOffset: { height: 20, width: 0 },
              shadowOpacity: 0.22,
              shadowRadius: 48,
            }}
          >
            <View
              style={{
                backgroundColor: colors.background.goalCard,
                borderColor: colors.border.warmSubtle,
                borderRightWidth: 1,
                width: RAIL_WIDTH,
              }}
            >
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  paddingHorizontal: 17,
                  paddingVertical: 20,
                }}
                showsVerticalScrollIndicator={false}
              >
                <Pressable
                  accessibilityLabel="Edit account profile"
                  accessibilityRole="button"
                  onPress={onOpenAccount}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 11,
                    opacity: pressed ? 0.72 : 1,
                    paddingBottom: 15,
                  })}
                >
                  <Avatar
                    avatarUrl={profile.avatarUrl}
                    displayName={profile.displayName}
                    size={44}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Typography numberOfLines={1} variant="card-title">
                      {profile.displayName || 'Your account'}
                    </Typography>
                    <Typography
                      numberOfLines={1}
                      style={{ color: colors.text.muted, marginTop: 1 }}
                      variant="meta"
                    >
                      {profile.username
                        ? `@${profile.username}`
                        : 'Your profile'}
                    </Typography>
                  </View>
                </Pressable>

                <View
                  style={{
                    borderBottomColor: colors.border.warmSubtle,
                    borderBottomWidth: 1,
                    borderTopColor: colors.border.warmSubtle,
                    borderTopWidth: 1,
                    flexDirection: 'row',
                    gap: 18,
                    paddingVertical: 13,
                  }}
                >
                  <StatCell
                    label="Friends"
                    value={friendsController.friendCount}
                  />
                  <StatCell
                    label="Sent"
                    value={friendsController.sentRequests.length}
                  />
                </View>

                <View
                  accessibilityLabel="Friends views"
                  accessibilityRole="tablist"
                  style={{ paddingVertical: 13 }}
                >
                  <Typography
                    style={{
                      color: colors.text.muted,
                      paddingBottom: 7,
                      paddingHorizontal: 7,
                    }}
                    variant="section-eyebrow"
                  >
                    Friends
                  </Typography>
                  <RailButton
                    active={tab === 'friends'}
                    buttonRef={friendsTabRef}
                    count={friendsController.friendCount}
                    icon={
                      <Ionicons
                        color={
                          tab === 'friends'
                            ? colors.text.accent
                            : colors.text.muted
                        }
                        name="people-outline"
                        size={17}
                      />
                    }
                    isTab
                    label="Friends"
                    onPress={() => selectTab('friends')}
                    onWebKeyDown={(event) =>
                      handleTabKeyDown(event, 'friends')
                    }
                  />
                  <RailButton
                    active={tab === 'requests'}
                    badgeCount={requestCount}
                    buttonRef={requestsTabRef}
                    icon={
                      <Ionicons
                        color={
                          tab === 'requests'
                            ? colors.text.accent
                            : colors.text.muted
                        }
                        name="mail-unread-outline"
                        size={17}
                      />
                    }
                    isTab
                    label="Requests"
                    onPress={() => selectTab('requests')}
                    onWebKeyDown={(event) =>
                      handleTabKeyDown(event, 'requests')
                    }
                  />
                  <RailButton
                    active={tab === 'add'}
                    buttonRef={addTabRef}
                    icon={
                      <Ionicons
                        color={
                          tab === 'add'
                            ? colors.text.accent
                            : colors.text.muted
                        }
                        name="person-add-outline"
                        size={17}
                      />
                    }
                    isTab
                    label="Add people"
                    onPress={() => selectTab('add')}
                    onWebKeyDown={(event) =>
                      handleTabKeyDown(event, 'add')
                    }
                  />
                </View>

                <View style={{ flex: 1, minHeight: 18 }} />

                <View
                  style={{
                    borderTopColor: colors.border.warmSubtle,
                    borderTopWidth: 1,
                    gap: 1,
                    paddingTop: 10,
                  }}
                >
                  <View
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      gap: 10,
                      minHeight: 40,
                      paddingHorizontal: 9,
                    }}
                  >
                    <View style={{ alignItems: 'center', width: 18 }}>
                      <Ionicons
                        color={colors.text.muted}
                        name="moon-outline"
                        size={17}
                      />
                    </View>
                    <Typography
                      style={{ color: colors.text.primary, flex: 1 }}
                      variant="micro-label"
                    >
                      Dark mode
                    </Typography>
                    <Toggle
                      accessibilityLabel="Dark mode"
                      onValueChange={toggleTheme}
                      style={{ transform: [{ scale: 0.84 }] }}
                      value={themeMode === 'dark'}
                    />
                  </View>
                  <RailButton
                    active={tab === 'settings'}
                    icon={
                      <Ionicons
                        color={
                          tab === 'settings'
                            ? colors.text.accent
                            : colors.text.muted
                        }
                        name="settings-outline"
                        size={17}
                      />
                    }
                    label="Settings"
                    onPress={() => selectTab('settings')}
                  />
                  <RailButton
                    danger
                    icon={
                      <Ionicons
                        color={colors.feedback.danger.text}
                        name="log-out-outline"
                        size={17}
                      />
                    }
                    label="Log out"
                    onPress={onLogOut}
                  />
                </View>
              </ScrollView>
            </View>

            <View
              {...(Platform.OS === 'web'
                ? ({ role: 'tabpanel' } as object)
                : {})}
              accessibilityLabel={`${title} panel`}
              style={{ flex: 1, minWidth: 0 }}
            >
              <View
                style={{
                  alignItems: 'center',
                  borderBottomColor: colors.border.warmSubtle,
                  borderBottomWidth: 1,
                  flexDirection: 'row',
                  gap: 12,
                  minHeight: 79,
                  paddingHorizontal: 24,
                  paddingVertical: 15,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    numberOfLines={1}
                    style={{ fontSize: 20, lineHeight: 25 }}
                    variant="heading"
                  >
                    {title}
                  </Typography>
                  <Typography
                    numberOfLines={2}
                    style={{ color: colors.text.muted, marginTop: 2 }}
                    variant="meta"
                  >
                    {subtitle}
                  </Typography>
                </View>
                {tab !== 'settings' ? (
                  <Pressable
                    accessibilityLabel="Refresh friends"
                    accessibilityRole="button"
                    accessibilityState={{
                      busy: friendsController.isRefreshing,
                      disabled:
                      friendsController.isInitialLoading ||
                        friendsController.isRefreshing,
                    }}
                    disabled={
                      friendsController.isInitialLoading ||
                      friendsController.isRefreshing
                    }
                    hitSlop={5}
                    onPress={() => void friendsController.refresh()}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      backgroundColor: pressed
                        ? colors.background.selectedRow
                        : 'transparent',
                      borderColor: colors.border.divider,
                      borderRadius: 9,
                      borderWidth: 1,
                      height: 34,
                      justifyContent: 'center',
                      opacity:
                        friendsController.isInitialLoading ||
                        friendsController.isRefreshing
                          ? 0.6
                          : 1,
                      width: 34,
                    })}
                  >
                    {friendsController.isRefreshing ? (
                      <ActivityIndicator
                        color={colors.text.muted}
                        size="small"
                      />
                    ) : (
                      <Ionicons
                        color={colors.text.secondary}
                        name="refresh"
                        size={17}
                      />
                    )}
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityLabel="Close account panel"
                  accessibilityRole="button"
                  hitSlop={5}
                  onPress={onClose}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    backgroundColor: pressed
                      ? colors.background.selectedRow
                      : 'transparent',
                    borderColor: colors.border.divider,
                    borderRadius: 9,
                    borderWidth: 1,
                    height: 34,
                    justifyContent: 'center',
                    width: 34,
                  })}
                >
                  <Ionicons
                    color={colors.text.secondary}
                    name="close"
                    size={19}
                  />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 18 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
                style={{ flex: 1 }}
              >
                {tab === 'settings' ? (
                  <View style={{ padding: 24 }}>
                    <SettingsPane active onClose={onClose} />
                  </View>
                ) : refreshError ? (
                  <View
                    accessibilityLiveRegion="polite"
                    style={{
                      alignItems: 'center',
                      backgroundColor: colors.feedback.danger.bg,
                      borderBottomColor: colors.feedback.danger.border,
                      borderBottomWidth: 1,
                      flexDirection: 'row',
                      gap: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Typography
                      style={{
                        color: colors.feedback.danger.text,
                        flex: 1,
                      }}
                      variant="caption"
                    >
                      {refreshError}
                    </Typography>
                    <Button
                      onPress={() => void friendsController.refresh()}
                      size="compact"
                      style={{ minHeight: 34, paddingHorizontal: 12 }}
                      variant="secondary"
                    >
                      Retry
                    </Button>
                  </View>
                ) : null}

                {tab !== 'settings' &&
                friendsController.isInitialLoading &&
                !friendsController.hasHydrated ? (
                  <LoadingPane />
                ) : tab !== 'settings' && isUnhydratedError ? (
                  <LoadErrorPane
                    message={getFriendErrorCopy(
                      friendsController.loadError!,
                      'Could not load friends.',
                    )}
                    onRetry={() => void friendsController.refresh()}
                  />
                ) : tab === 'friends' ? (
                  <FriendsListPane
                    friends={friendsController.friends}
                    sentCount={friendsController.sentRequests.length}
                  />
                ) : tab === 'requests' ? (
                  <RequestsPane
                    connectionMutations={
                      friendsController.connectionMutations
                    }
                    incomingRequests={friendsController.incomingRequests}
                    onAccept={friendsController.acceptRequest}
                    onDecline={friendsController.declineRequest}
                    sentCount={friendsController.sentRequests.length}
                  />
                ) : tab === 'add' ? (
                  <AddPeoplePane
                    isSearchLoading={friendsController.isSearchLoading}
                    onQueryChange={friendsController.setSearchQuery}
                    onRetrySearch={retrySearch}
                    onReviewRequests={() =>
                      selectTab('requests', true)
                    }
                    onSend={friendsController.sendRequest}
                    searchError={
                      friendsController.searchError
                        ? getFriendErrorCopy(
                            friendsController.searchError,
                            'Could not search for people.',
                          )
                        : null
                    }
                    searchQuery={friendsController.searchQuery}
                    searchResults={friendsController.searchResults}
                    sendMutations={friendsController.sendMutations}
                  />
                ) : null}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LoadingPane() {
  const colors = useThemeColors();

  return (
    <View
      accessibilityLabel="Loading friends"
      accessibilityLiveRegion="polite"
      style={{
        alignItems: 'center',
        flex: 1,
        gap: 10,
        justifyContent: 'center',
        minHeight: 220,
        padding: 28,
      }}
    >
      <ActivityIndicator color={colors.text.muted} size="small" />
      <Typography style={{ color: colors.text.secondary }} variant="meta">
        Loading friends…
      </Typography>
    </View>
  );
}

function LoadErrorPane({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const colors = useThemeColors();

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ alignItems: 'flex-start', gap: 12, padding: 28 }}
    >
      <Typography
        style={{ color: colors.feedback.danger.text }}
        variant="meta"
      >
        {message}
      </Typography>
      <Button onPress={onRetry} size="compact" variant="secondary">
        Try again
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
});
