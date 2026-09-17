import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { FONT, RADIUS, SPACE, TYPE } from '@/constants/design';
import { CATEGORY_ACCENT_THEME } from '@/constants/themes';
import { useThemeColors } from '@/store/uiStore';
import { personById } from '../fixtures';
import type { CirclesPost, LinkableItem, PostAttachment } from '../types';
import {
  CategoryGlyph,
  ImagePlaceholder,
  PersonAvatar,
  QuietAction,
  useDarkMode,
} from './primitives';

const LINK_META = {
  goal: { eyebrow: 'Goal', icon: 'flag-outline' },
  milestone: { eyebrow: 'Milestone', icon: 'checkmark-circle-outline' },
  reflection: { eyebrow: 'Reflection', icon: 'leaf-outline' },
} as const;

/**
 * Linked Goal / milestone / reflection. Deliberately title + description only:
 * a feed link never exposes progress, Tasks, or the underlying content.
 */
function LinkAttachment({ attachment }: { attachment: LinkableItem }) {
  const colors = useThemeColors();
  const meta = LINK_META[attachment.kind];
  const description = attachment.kind === 'milestone'
    ? `Part of ${attachment.goalTitle}`
    : attachment.description;
  return (
    <View
      accessibilityLabel={`${meta.eyebrow}: ${attachment.title}. ${description}`}
      style={{
        alignItems: 'center',
        backgroundColor: attachment.kind === 'milestone' ? colors.background.selectedRow : colors.background.subtle,
        borderColor: attachment.kind === 'milestone' ? 'transparent' : colors.border.warmSubtle,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        flexDirection: 'row',
        gap: SPACE.lg,
        padding: SPACE.lg,
      }}
    >
      {attachment.kind === 'reflection' ? (
        <View style={{ alignItems: 'center', backgroundColor: colors.background.card, borderRadius: RADIUS.sm, height: 36, justifyContent: 'center', width: 36 }}>
          <Ionicons color={colors.text.accent} name={meta.icon} size={17} />
        </View>
      ) : attachment.kind === 'milestone' ? (
        <View style={{ alignItems: 'center', backgroundColor: colors.background.card, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 }}>
          <Ionicons color={colors.text.accent} name={meta.icon} size={17} />
        </View>
      ) : (
        <CategoryGlyph category={attachment.category} size={36} />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="meta"
          style={{
            color: attachment.kind === 'milestone' ? colors.text.accent : colors.text.muted,
            fontFamily: attachment.kind === 'milestone' ? FONT.ui.semibold : FONT.ui.medium,
          }}
        >
          {meta.eyebrow}
        </Typography>
        <Typography numberOfLines={1} variant="emphasis-sm" style={{ fontSize: 15 }}>{attachment.title}</Typography>
        <Typography numberOfLines={2} variant="caption" style={{ color: colors.text.secondary }}>{description}</Typography>
      </View>
    </View>
  );
}

function GoalCompleteAttachment({ attachment }: { attachment: Extract<PostAttachment, { kind: 'goal_complete' }> }) {
  const colors = useThemeColors();
  const dark = useDarkMode();
  const theme = CATEGORY_ACCENT_THEME[attachment.category];
  return (
    <View
      accessibilityLabel={`Goal completed: ${attachment.goalTitle}. ${attachment.reflection}`}
      style={{
        backgroundColor: colors.background.selectedRow,
        borderColor: dark ? 'rgba(99,193,116,0.22)' : 'rgba(99,193,116,0.28)',
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        paddingHorizontal: SPACE['3xl'],
        paddingVertical: SPACE['2xl'],
      }}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.xl }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.background.card,
            borderRadius: 28,
            height: 56,
            justifyContent: 'center',
            width: 56,
          }}
        >
          <Ionicons color={dark ? theme.color : theme.mid} name="checkmark" size={26} />
        </View>
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Typography variant="meta" style={{ color: colors.text.accent, fontFamily: FONT.ui.semibold }}>
            Goal completed · {attachment.completedLabel}
          </Typography>
          <Typography variant="title" style={{ fontSize: 20, lineHeight: 26 }}>{attachment.goalTitle}</Typography>
          <Typography variant="ai-italic" style={{ ...TYPE.bodySmall, color: colors.text.secondary, fontStyle: 'italic' }}>
            {attachment.reflection}
          </Typography>
        </View>
      </View>
    </View>
  );
}

function PostAttachmentView({ attachment }: { attachment: PostAttachment }) {
  if (attachment.kind === 'goal_complete') return <GoalCompleteAttachment attachment={attachment} />;
  return <LinkAttachment attachment={attachment} />;
}

function CommentsThread({
  post,
  onAddComment,
}: {
  post: CirclesPost;
  onAddComment: (body: string) => void;
}) {
  const colors = useThemeColors();
  const [draft, setDraft] = useState('');
  const submit = () => {
    if (!draft.trim()) return;
    onAddComment(draft.trim());
    setDraft('');
  };
  return (
    <View style={{ gap: SPACE.lg, paddingTop: SPACE.xl }}>
      {post.comments.length === 0 ? (
        <Typography variant="caption" style={{ color: colors.text.muted }}>
          No comments yet. A few kind words go a long way.
        </Typography>
      ) : null}
      {post.comments.map((comment) => {
        const author = personById(comment.authorId);
        return (
          <View key={comment.id} style={{ flexDirection: 'row', gap: SPACE.md }}>
            <PersonAvatar person={author} size={30} />
            <View
              style={{
                backgroundColor: colors.background.subtle,
                borderRadius: RADIUS.md,
                flex: 1,
                paddingHorizontal: SPACE.lg,
                paddingVertical: SPACE.md,
              }}
            >
              <View style={{ flexDirection: 'row', gap: SPACE.md }}>
                <Typography variant="emphasis-sm" style={{ fontSize: 13 }}>{author.displayName}</Typography>
                <Typography variant="meta" style={{ color: colors.text.muted }}>{comment.createdLabel}</Typography>
              </View>
              <Typography variant="body-small" style={{ color: colors.text.primary }}>{comment.body}</Typography>
            </View>
          </View>
        );
      })}
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
        <TextInput
          accessibilityLabel="Write a comment"
          onChangeText={setDraft}
          onSubmitEditing={submit}
          placeholder="Add a supportive comment"
          placeholderTextColor={colors.text.muted}
          style={{
            ...TYPE.bodySmall,
            backgroundColor: colors.background.input,
            borderColor: colors.border.input,
            borderRadius: RADIUS.round,
            borderWidth: 1,
            color: colors.text.primary,
            flex: 1,
            minHeight: 40,
            paddingHorizontal: SPACE.xl,
            outlineStyle: 'none',
          } as never}
          value={draft}
        />
        <Pressable
          accessibilityLabel="Send comment"
          accessibilityRole="button"
          disabled={!draft.trim()}
          onPress={submit}
          style={({ hovered }) => ({
            alignItems: 'center',
            backgroundColor: hovered ? colors.accent.primaryHover : colors.accent.primary,
            borderRadius: 20,
            height: 40,
            justifyContent: 'center',
            opacity: draft.trim() ? 1 : 0.4,
            width: 40,
          })}
        >
          <Ionicons color={colors.text.onAccent} name="arrow-up" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

export function FeedPostCard({
  post,
  compact,
  onOpenPerson,
  onEncourage,
  onSave,
  onAddComment,
}: {
  post: CirclesPost;
  compact: boolean;
  onOpenPerson: (personId: string) => void;
  onEncourage: () => void;
  onSave: () => void;
  onAddComment: (body: string) => void;
}) {
  const colors = useThemeColors();
  const author = personById(post.authorId);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const sideImage = !!post.image && !compact;
  const isMine = post.authorId === 'me';

  return (
    <Card elevated padding="spacious">
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
        <Pressable
          accessibilityLabel={isMine ? 'You' : `Open ${author.displayName}`}
          accessibilityRole="button"
          disabled={isMine}
          onPress={() => onOpenPerson(author.id)}
          style={{ alignItems: 'center', flex: 1, flexDirection: 'row', gap: SPACE.lg, minWidth: 0 }}
        >
          <PersonAvatar person={author} size={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Typography numberOfLines={1} variant="emphasis-sm" style={{ fontSize: 16 }}>
              {author.displayName}
            </Typography>
            <Typography variant="meta" style={{ color: colors.text.muted }}>{post.createdLabel}</Typography>
          </View>
        </Pressable>
        <Pressable
          accessibilityLabel="Post options"
          accessibilityRole="button"
          hitSlop={8}
          style={({ hovered }) => ({
            alignItems: 'center',
            backgroundColor: hovered ? colors.background.subtle : 'transparent',
            borderRadius: 18,
            height: 36,
            justifyContent: 'center',
            width: 36,
          })}
        >
          <Ionicons color={colors.text.muted} name="ellipsis-horizontal" size={18} />
        </Pressable>
      </View>

      <View style={{ gap: SPACE.xl, marginTop: SPACE.xl, paddingLeft: compact ? 0 : 56 }}>
        {post.kind === 'goal_complete' && post.attachment ? (
          <PostAttachmentView attachment={post.attachment} />
        ) : null}

        <View style={{ flexDirection: sideImage ? 'row' : 'column', gap: SPACE.xl }}>
          {post.image ? (
            <View style={{ width: sideImage ? '42%' : '100%' }}>
              <ImagePlaceholder caption={post.image.caption} height={sideImage ? 200 : 190} tone={post.image.tone} />
            </View>
          ) : null}
          <View style={{ flex: sideImage ? 1 : undefined, gap: SPACE.xl, minWidth: 0 }}>
            <Typography variant="content" style={{ color: colors.text.primary, fontSize: 16, lineHeight: 25 }}>
              {post.body}
            </Typography>
            {post.kind !== 'goal_complete' && post.attachment ? (
              <PostAttachmentView attachment={post.attachment} />
            ) : null}
          </View>
        </View>

        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: SPACE.xs,
            marginLeft: -SPACE.md,
            marginRight: -SPACE.md,
          }}
        >
          <QuietAction
            active={post.encouragedByMe}
            activeColor={colors.text.accent}
            accessibilityLabel={`${post.encouragedByMe ? 'Encouraged' : 'Encourage'}, ${post.encouragements}`}
            icon={post.encouragedByMe ? 'leaf' : 'leaf-outline'}
            label={post.encouragements > 0 ? `Encourage · ${post.encouragements}` : 'Encourage'}
            onPress={onEncourage}
          />
          <QuietAction
            active={commentsOpen}
            icon="chatbubble-outline"
            label={post.comments.length > 0 ? `Comment · ${post.comments.length}` : 'Comment'}
            onPress={() => setCommentsOpen((value) => !value)}
          />
          <View style={{ flex: 1 }} />
          <QuietAction
            active={post.savedByMe}
            icon={post.savedByMe ? 'bookmark' : 'bookmark-outline'}
            label={post.savedByMe ? 'Saved' : 'Save'}
            onPress={onSave}
          />
        </View>
      </View>

      {commentsOpen ? (
        <View
          style={{
            borderTopColor: colors.border.warmSubtle,
            borderTopWidth: 1,
            marginLeft: compact ? 0 : 56,
            marginTop: SPACE.sm,
          }}
        >
          <CommentsThread onAddComment={onAddComment} post={post} />
        </View>
      ) : null}
    </Card>
  );
}
