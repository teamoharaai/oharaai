import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { InternalReleaseNotes } from '@/config/internal-release';

export function InternalReleaseNotesModal({
  release,
  visible,
  onClose,
}: {
  release: InternalReleaseNotes;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const titleId = `${release.id}-title`;

  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const dialog = document.querySelector<HTMLElement>('[data-internal-release-dialog="true"]');
    const closeButton = dialog?.querySelector<HTMLElement>('[aria-label="Close what\'s new"]');
    const focusTimer = globalThis.setTimeout(() => closeButton?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      globalThis.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose, visible]);

  const dialogWebProps = Platform.OS === 'web'
    ? ({
        'aria-labelledby': titleId,
        'aria-modal': true,
        'data-internal-release-dialog': 'true',
        role: 'dialog',
      } as const)
    : {};

  return (
    <Modal
      closeOnBackdropPress
      contentStyle={{ borderRadius: RADIUS.lg, maxHeight: '88%', maxWidth: 560, overflow: 'hidden', padding: 0 }}
      onClose={onClose}
      showCloseButton={false}
      visible={visible}
    >
      <View accessibilityViewIsModal {...dialogWebProps}>
        <View style={{
          alignItems: 'flex-start',
          borderBottomColor: colors.border.divider,
          borderBottomWidth: 1,
          paddingBottom: SPACE.xl,
          paddingHorizontal: SPACE['3xl'],
          paddingTop: SPACE['3xl'],
        }}>
          <Typography variant="eyebrow" style={{ color: colors.text.accent, marginBottom: SPACE.sm }}>
            {release.version}
          </Typography>
          <Typography nativeID={titleId} variant="heading" style={{ fontSize: 28, lineHeight: 34, paddingRight: 46 }}>
            {release.title}
          </Typography>
          <Typography variant="body" style={{ color: colors.text.secondary, lineHeight: 22, marginTop: SPACE.md }}>
            {release.summary}
          </Typography>
          <Pressable
            accessibilityLabel="Close what's new"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: pressed ? colors.background.selectedRow : 'transparent',
              borderRadius: RADIUS.round,
              height: 40,
              justifyContent: 'center',
              position: 'absolute',
              right: SPACE.xl,
              top: SPACE.xl,
              width: 40,
            })}
          >
            <Ionicons name="close" color={colors.text.secondary} size={22} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: SPACE['2xl'], padding: SPACE['3xl'] }}>
          {release.sections.map((section) => (
            <View key={section.heading}>
              <Typography variant="emphasis-sm" style={{ fontSize: 15, marginBottom: SPACE.md }}>
                {section.heading}
              </Typography>
              <View style={{ gap: SPACE.md }}>
                {section.updates.map((update) => (
                  <View key={update} style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.md }}>
                    <View style={{
                      backgroundColor: colors.accent.primary,
                      borderRadius: RADIUS.round,
                      height: 5,
                      marginTop: 8,
                      width: 5,
                    }} />
                    <Typography variant="meta" style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
                      {update}
                    </Typography>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={{
          alignItems: 'flex-end',
          borderTopColor: colors.border.divider,
          borderTopWidth: 1,
          padding: SPACE['2xl'],
        }}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => ({
              backgroundColor: colors.accent.primary,
              borderRadius: RADIUS.round,
              opacity: pressed ? 0.78 : 1,
              paddingHorizontal: SPACE['2xl'],
              paddingVertical: SPACE.lg,
            })}
          >
            <Typography variant="emphasis-sm" style={{ color: colors.text.onAccent }}>Continue</Typography>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
