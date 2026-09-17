import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { FONT, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { authorName, formatRelativeTime, toCategory } from '../format';
import type { CircleFeedLink, CirclesFeedPost, PostComment } from '../types';
import { CategoryGlyph, PersonAvatar, QuietAction } from './primitives';

const LINK_META = {
  goal: { eyebrow: 'Goal', icon: 'flag-outline' },
  milestone: { eyebrow: 'Milestone', icon: 'checkmark-circle-outline' },
  reflection: { eyebrow: 'Reflection', icon: 'leaf-outline' },
} as const;

/**
 * Linked Goal / milestone / reflection. Deliberately title + description only:
 * a feed link never exposes progress, Tasks, or the underlying content (CD-005).
 */
function LinkAttachment({ link }: { link: CircleFeedLink }) {
  const colors = useThemeColors();
  const meta = LINK_META[link.kind];
  const isMilestone = link.kind === 'milestone';
  return (
    <View
      accessibilityLabel={`${meta.eyebrow}: ${link.title}.${link.description ? ` ${link.description}` : ''}`}
      style={{
        alignItems: 'center',
        backgroundColor: isMilestone ? colors.background.selectedRow : colors.background.subtle,
        borderColor: isMilestone ? 'transparent' : colors.border.warmSubtle,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        flexDirection: 'row',
        gap: SPACE.lg,
        padding: SPACE.lg,
      }}
    >
      {link.kind === 'goal' && link.category ? (
        <CategoryGlyph category={toCategory(link.category)} size={36} />
      ) : (
        <View style={{ alignItems: 'center', backgroundColor: colors.background.card, borderRadius: isMilestone ? 18 : RADIUS.sm, height: 36, justifyContent: 'center', width: 36 }}>
          <Ionicons color={colors.text.accent} name={meta.icon} size={17} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="meta"
          style={{
            color: isMilestone ? colors.text.accent : colors.text.muted,
            fontFamily: isMilestone ? FONT.ui.semibold : FONT.ui.medium,
          }}
        >
          {meta.eyebrow}
        </Typography>
        <Typography numberOfLines={1} variant="emphasis-sm" style={{ fontSize: 15 }}>{link.title}</Typography>
        {link.description ? (
          <Typography numberOfLines={2} variant="caption" style={{ color: colors.text.secondary }}>{link.description}</Typography>
        ) : null}
      </View>
    </View>
  );
}

function CommentsThread({
  comments,
  myId,
  onAddComment,
  onDeleteComment,
}: {
  comments: PostComment[];
  myId: string | null;
  onAddComment: (body: string) => void;
  onDeleteComment: (commentId: string) => void;
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
      {comments.length === 0 ? (
        <Typography variant="caption" style={{ color: colors.text.muted }}>
          No comments yet. A few kind words go a long way.
        </Typography>
      ) : null}
      {comments.map((comment) => {
        const mine = comment.authorId === myId;
        return (
          <View key={comment.id} style={{ flexDirection: 'row', gap: SPACE.md }}>
            <PersonAvatar person={comment.author ?? { displayName: authorName(comment.author), username: '', avatarUrl: null }} size={30} />
            <View
              style={{
                backgroundColor: colors.background.subtle,
                borderRadius: RADIUS.md,
                flex: 1,
                paddingHorizontal: SPACE.lg,
                paddingVertical: SPACE.md,
              }}
            >
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
                <Typography variant="emphasis-sm" style={{ fontSize: 13 }}>{authorName(comment.author)}</Typography>
                <Typography variant="meta" style={{ color: colors.text.muted }}>{formatRelativeTime(comment.createdAt)}</Typography>
                {mine ? (
                  <Pressable accessibilityLabel="Delete comment" accessibilityRole="button" hitSlop={6} onPress={() => onDeleteComment(comment.id)} style={{ marginLeft: 'auto' }}>
                    <Ionicons color={colors.text.muted} name="trash-outline" size={13} />
                  </Pressable>
                ) : null}
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
  myId,
  comments,
  onOpenPerson,
  onOpenComments,
  onOpenEncouragers,
  onEncourage,
  onSave,
  onAddComment,
  onDeleteComment,
}: {
  post: CirclesFeedPost;
  compact: boolean;
  myId: string | null;
  comments: PostComment[];
  onOpenPerson: (personId: string) => void;
  onOpenComments: () => void;
  onOpenEncouragers: () => void;
  onEncourage: () => void;
  onSave: () => void;
  onAddComment: (body: string) => void;
  onDeleteComment: (commentId: string) => void;
}) {
  const colors = useThemeColors();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const isMine = post.authorId === myId;
  const name = isMine ? 'You' : authorName(post.author);

  const openComments = () => {
    setCommentsOpen((value) => {
      if (!value) onOpenComments();
      return !value;
    });
  };

  return (
    <Card elevated padding="spacious">
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
        <Pressable
          accessibilityLabel={isMine ? 'You' : `Open ${name}`}
          accessibilityRole="button"
          disabled={isMine || !post.author}
          onPress={() => onOpenPerson(post.authorId)}
          style={{ alignItems: 'center', flex: 1, flexDirection: 'row', gap: SPACE.lg, minWidth: 0 }}
        >
          <PersonAvatar person={post.author ?? { displayName: name, username: '', avatarUrl: null }} size={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Typography numberOfLines={1} variant="emphasis-sm" style={{ fontSize: 16 }}>{name}</Typography>
            <Typography variant="meta" style={{ color: colors.text.muted }}>{formatRelativeTime(post.createdAt)}</Typography>
          </View>
        </Pressable>
      </View>

      <View style={{ gap: SPACE.xl, marginTop: SPACE.xl, paddingLeft: compact ? 0 : 56 }}>
        <View style={{ gap: SPACE.xl, minWidth: 0 }}>
          <Typography variant="content" style={{ color: colors.text.primary, fontSize: 16, lineHeight: 25 }}>
            {post.body}
          </Typography>
          {post.link ? <LinkAttachment link={post.link} /> : null}
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
            accessibilityLabel={post.encouragedByMe ? 'Encouraged' : 'Encourage'}
            icon={post.encouragedByMe ? 'leaf' : 'leaf-outline'}
            label="Encourage"
            onPress={onEncourage}
          />
          {post.encouragementCount > 0 ? (
            <QuietAction
              accessibilityLabel={`${post.encouragementCount} ${post.encouragementCount === 1 ? 'person' : 'people'} encouraged. See who`}
              label={String(post.encouragementCount)}
              onPress={onOpenEncouragers}
            />
          ) : null}
          <QuietAction
            active={commentsOpen}
            icon="chatbubble-outline"
            label={post.commentCount > 0 ? `Comment · ${post.commentCount}` : 'Comment'}
            onPress={openComments}
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
          <CommentsThread comments={comments} myId={myId} onAddComment={onAddComment} onDeleteComment={onDeleteComment} />
        </View>
      ) : null}
    </Card>
  );
}
