import { useEffect } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { FEATURES } from '@/constants/features';
import { useThemeColors } from '@/store/uiStore';
import { authorName, firstName, formatRelativeTime } from '../format';
import { useCirclesStore } from '../store';
import type { SavedPost } from '../types';
import { PersonAvatar, QuietAction } from './primitives';

function linkLabel(saved: SavedPost): string | null {
  const link = saved.post.link;
  if (!link) return null;
  const eyebrow = link.kind === 'goal' ? 'Goal' : link.kind === 'milestone' ? 'Milestone' : 'Reflection';
  return `${eyebrow} · ${link.title}`;
}

/**
 * Private "Saved" collection, shown from the profile panel. Only the viewer ever
 * sees their saved posts (owner-only RLS).
 */
export function SavedPostsPane() {
  const colors = useThemeColors();
  const saved = useCirclesStore((state) => state.saved);
  const ensureLoaded = useCirclesStore((state) => state.ensureLoaded);
  const loadSaved = useCirclesStore((state) => state.loadSaved);
  const toggleSave = useCirclesStore((state) => state.toggleSave);

  useEffect(() => {
    if (!FEATURES.CIRCLES_ENABLED) return;
    void ensureLoaded();
    void loadSaved();
  }, [ensureLoaded, loadSaved]);

  if (!FEATURES.CIRCLES_ENABLED || saved.length === 0) {
    return (
      <View style={{ alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE['3xl'], paddingVertical: SPACE['5xl'] }}>
        <Ionicons color={colors.text.muted} name="bookmark-outline" size={22} />
        <Typography variant="emphasis-sm">Nothing saved yet</Typography>
        <Typography variant="caption" style={{ color: colors.text.secondary, textAlign: 'center' }}>
          Tap Save on a post in Home to keep it here. Only you can see what you save.
        </Typography>
      </View>
    );
  }

  return (
    <View style={{ gap: SPACE.lg, padding: SPACE['3xl'] }}>
      {saved.map((item) => {
        const author = item.post.author;
        const label = linkLabel(item);
        return (
          <View
            key={item.post.id}
            style={{
              backgroundColor: colors.background.subtle,
              borderColor: colors.border.warmSubtle,
              borderRadius: RADIUS.md,
              borderWidth: 1,
              gap: SPACE.md,
              padding: SPACE.xl,
            }}
          >
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
              <PersonAvatar person={author ?? { displayName: authorName(author), username: '', avatarUrl: null }} size={32} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Typography numberOfLines={1} variant="emphasis-sm">{authorName(author)}</Typography>
                <Typography variant="meta" style={{ color: colors.text.muted }}>{formatRelativeTime(item.post.createdAt)}</Typography>
              </View>
              <QuietAction
                accessibilityLabel={`Remove ${firstName(author) || 'this'} post from Saved`}
                active
                icon="bookmark"
                label="Saved"
                onPress={() => void toggleSave(item.post.id)}
              />
            </View>
            <Typography numberOfLines={3} variant="body-small" style={{ color: colors.text.primary }}>
              {item.post.body}
            </Typography>
            {label ? (
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
                <Ionicons color={colors.text.accent} name="flag-outline" size={14} />
                <Typography numberOfLines={1} variant="meta" style={{ color: colors.text.secondary }}>{label}</Typography>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
