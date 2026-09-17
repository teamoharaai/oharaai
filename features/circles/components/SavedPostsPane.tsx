import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { personById } from '../fixtures';
import { useCirclesStore } from '../store';
import type { CirclesPost } from '../types';
import { PersonAvatar, QuietAction } from './primitives';

function attachmentLabel(post: CirclesPost): string | null {
  const attachment = post.attachment;
  if (!attachment) return null;
  if (attachment.kind === 'goal') return `Goal · ${attachment.title}`;
  if (attachment.kind === 'milestone') return `Milestone · ${attachment.title}`;
  if (attachment.kind === 'reflection') return `Reflection · ${attachment.title}`;
  return `Goal completed · ${attachment.goalTitle}`;
}

/**
 * Private "Saved" collection, shown from the profile panel. Only the viewer
 * ever sees their saved posts. PROTOTYPE: reads in-memory Circles state.
 */
export function SavedPostsPane() {
  const colors = useThemeColors();
  const posts = useCirclesStore((state) => state.posts);
  const toggleSave = useCirclesStore((state) => state.toggleSave);
  const saved = posts.filter((post) => post.savedByMe);

  if (saved.length === 0) {
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
      {saved.map((post) => {
        const author = personById(post.authorId);
        const label = attachmentLabel(post);
        return (
          <View
            key={post.id}
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
              <PersonAvatar person={author} size={32} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Typography numberOfLines={1} variant="emphasis-sm">{author.displayName}</Typography>
                <Typography variant="meta" style={{ color: colors.text.muted }}>{post.createdLabel}</Typography>
              </View>
              <QuietAction
                accessibilityLabel={`Remove ${author.firstName}’s post from Saved`}
                active
                icon="bookmark"
                label="Saved"
                onPress={() => toggleSave(post.id)}
              />
            </View>
            <Typography numberOfLines={3} variant="body-small" style={{ color: colors.text.primary }}>
              {post.body}
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
