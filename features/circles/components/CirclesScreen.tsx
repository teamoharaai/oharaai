import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthenticatedPageShell } from '@/components/layout/AuthenticatedPageShell';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { authorName, firstName, toCategory } from '../format';
import { fetchEncouragers } from '../services/circles-service';
import { useCircles } from '../hooks/useCircles';
import { milestoneLabel, milestoneProgress } from '../progress';
import type { CircleGoalSummary, CirclesAuthor, FeedFilter } from '../types';
import { SharedWithYouCard } from './ContextCards';
import { PersonSheet, SharedGoalSheet } from './CirclesSheets';
import { FeedPostCard } from './FeedPostCard';
import { PostComposer } from './PostComposer';
import { CategoryGlyph, PersonAvatar, ProgressTrack, useCategoryTone } from './primitives';

const FILTER_OPTIONS: { value: FeedFilter; label: string }[] = [
  { value: 'all', label: 'All updates' },
  { value: 'reflections', label: 'Reflections' },
  { value: 'milestones', label: 'Milestones' },
  { value: 'completed', label: 'Completed' },
];

/** Two columns from here up; below, context collapses above the feed. */
const TWO_COLUMN_MIN_WIDTH = 1080;
const PAGE_MAX_WIDTH = 1280;

function SharedGoalTile({ goal, ownerName, onPress }: { goal: CircleGoalSummary; ownerName: string; onPress: () => void }) {
  const colors = useThemeColors();
  const category = toCategory(goal.category);
  const tone = useCategoryTone(category);
  const progress = milestoneProgress(goal.milestones);
  return (
    <Pressable
      accessibilityLabel={`${goal.title}, shared by ${ownerName}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.background.card,
        borderColor: colors.border.warmSubtle,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        gap: SPACE.md,
        opacity: pressed ? 0.8 : 1,
        padding: SPACE.xl,
        width: 200,
      })}
    >
      <CategoryGlyph category={category} size={36} />
      <View>
        <Typography numberOfLines={1} variant="emphasis-sm" style={{ fontSize: 15 }}>{goal.title}</Typography>
        <Typography numberOfLines={1} variant="caption" style={{ color: colors.text.secondary }}>Shared by {ownerName}</Typography>
      </View>
      <ProgressTrack color={tone.fg} value={progress.ratio ?? 0} />
      <Typography variant="meta" style={{ color: colors.text.muted }}>{milestoneLabel(progress)}</Typography>
    </Pressable>
  );
}

/** CD-013: tapping a post's encourage count reveals who encouraged. */
function EncouragersModal({ postId, onClose }: { postId: string | null; onClose: () => void }) {
  const colors = useThemeColors();
  const [encouragers, setEncouragers] = useState<CirclesAuthor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postId) return;
    let active = true;
    setLoading(true);
    setEncouragers([]);
    fetchEncouragers(postId)
      .then((people) => { if (active) setEncouragers(people); })
      .catch(() => { if (active) setEncouragers([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postId]);

  return (
    <Modal
      closeOnBackdropPress
      contentStyle={{ maxWidth: 380, width: '100%', padding: SPACE['3xl'], borderRadius: RADIUS.xl }}
      onClose={onClose}
      visible={!!postId}
    >
      <Typography accessibilityRole="header" variant="section-header" style={{ marginBottom: SPACE.xl }}>
        Encouraged by
      </Typography>
      {loading ? (
        <Typography variant="caption" style={{ color: colors.text.muted }}>Loading…</Typography>
      ) : encouragers.length === 0 ? (
        <Typography variant="caption" style={{ color: colors.text.secondary }}>No one yet.</Typography>
      ) : (
        <View style={{ gap: SPACE.lg }}>
          {encouragers.map((person) => (
            <View key={person.id} style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
              <PersonAvatar person={person} size={34} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Typography numberOfLines={1} variant="emphasis-sm">{authorName(person)}</Typography>
                {person.username ? (
                  <Typography variant="meta" style={{ color: colors.text.muted }}>@{person.username}</Typography>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </Modal>
  );
}

/**
 * Home, internally "Circles". The route owns non-social Home pieces (greeting,
 * Today's Focus, drafts) and passes them in as slots so this feature never
 * imports goals/momentum/profile code.
 */
export function CirclesScreen({
  greeting,
  todayFocus,
  feedNotice,
}: {
  greeting: ReactNode;
  todayFocus: ReactNode;
  /** Optional card shown above the composer (e.g. the drafts list). */
  feedNotice?: ReactNode;
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const twoColumn = width >= TWO_COLUMN_MIN_WIDTH;
  const compact = width < 720;
  const circles = useCircles();

  const [sharedExpanded, setSharedExpanded] = useState(false);
  const [openPersonId, setOpenPersonId] = useState<string | null>(null);
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);
  const [encouragersPostId, setEncouragersPostId] = useState<string | null>(null);

  const viewableGoals = [...circles.sharedWithMe, ...circles.publicGoals];
  const openGoal = viewableGoals.find((goal) => goal.id === openGoalId) ?? null;

  // Author identity comes from hydrated DTOs (post/goal author), never a fixture.
  const authorsById = new Map<string, CirclesAuthor>();
  for (const post of circles.posts) if (post.author) authorsById.set(post.author.id, post.author);
  for (const goal of viewableGoals) if (goal.owner) authorsById.set(goal.owner.id, goal.owner);
  const openPerson = openPersonId ? authorsById.get(openPersonId) ?? null : null;
  const openGoalOwner = openGoal?.owner ?? null;

  const scope = circles.scope;
  const scopeLabel = scope.kind === 'person'
    ? `${firstName(authorsById.get(scope.personId))}’s updates`
    : scope.kind === 'goal'
      ? viewableGoals.find((goal) => goal.id === scope.goalId)?.title ?? ''
      : null;
  const selectedGoalId = scope.kind === 'goal' ? scope.goalId : null;
  const ownerName = (goal: CircleGoalSummary) => firstName(goal.owner);

  const sharedCard = (
    <SharedWithYouCard
      expanded={sharedExpanded}
      goals={circles.sharedWithMe}
      onSelectGoal={setOpenGoalId}
      onToggleExpanded={() => setSharedExpanded((value) => !value)}
      selectedGoalId={selectedGoalId}
    />
  );

  const feed = (
    <View style={{ gap: SPACE['3xl'], minWidth: 0 }}>
      {feedNotice}
      <PostComposer
        compact={compact}
        me={circles.me}
        myGoals={circles.myGoals}
        myReflections={circles.myReflections}
        myMilestones={circles.linkable.milestones}
        onPublish={circles.publishPost}
      />

      <View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.lg, justifyContent: 'space-between' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: compact ? 0 : 1 }}>
          <SegmentedControl
            accessibilityLabel="Filter updates"
            compact={compact}
            onChange={circles.setFilter}
            options={FILTER_OPTIONS}
            value={circles.filter}
          />
        </ScrollView>
        {scopeLabel ? (
          <Pressable
            accessibilityLabel={`Showing ${scopeLabel}. Clear`}
            accessibilityRole="button"
            onPress={() => circles.setScope({ kind: 'everyone' })}
            style={({ hovered }) => ({
              alignItems: 'center',
              alignSelf: compact ? 'flex-start' : 'auto',
              backgroundColor: hovered ? colors.background.hoverAccent : colors.background.selectedRow,
              borderRadius: RADIUS.round,
              flexDirection: 'row',
              gap: SPACE.sm,
              minHeight: 36,
              paddingHorizontal: SPACE.lg,
            })}
          >
            <Typography variant="label" style={{ color: colors.text.primary }}>{scopeLabel}</Typography>
            <Ionicons color={colors.text.secondary} name="close" size={15} />
          </Pressable>
        ) : null}
      </View>

      {circles.visiblePosts.map((post) => (
        <FeedPostCard
          compact={compact}
          key={post.id}
          myId={circles.myId}
          comments={circles.commentsByPost[post.id] ?? []}
          onAddComment={(body) => void circles.addComment(post.id, body)}
          onDeleteComment={(commentId) => void circles.removeComment(post.id, commentId)}
          onEncourage={() => void circles.toggleEncourage(post.id)}
          onOpenComments={() => void circles.loadComments(post.id)}
          onOpenEncouragers={() => setEncouragersPostId(post.id)}
          onOpenPerson={setOpenPersonId}
          onSave={() => void circles.toggleSave(post.id)}
          post={post}
        />
      ))}

      <View style={{ alignItems: 'center', gap: SPACE.xs, paddingBottom: SPACE['4xl'], paddingTop: SPACE.md }}>
        <Ionicons color={colors.text.muted} name="leaf-outline" size={18} />
        <Typography variant="caption" style={{ color: colors.text.secondary, textAlign: 'center' }}>
          {circles.visiblePosts.length === 0 ? 'Nothing here yet.' : 'You’re caught up with your circles.'}
        </Typography>
        <Typography variant="meta" style={{ color: colors.text.muted, textAlign: 'center' }}>
          Growth feels more meaningful when the people around you can be part of it.
        </Typography>
      </View>
    </View>
  );

  // Flag off: Home keeps greeting + Today's Focus + drafts, no feed.
  if (!circles.enabled) {
    return (
      <AuthenticatedPageShell>
        <View style={{ alignSelf: 'center', maxWidth: PAGE_MAX_WIDTH, minWidth: 0, width: '100%' }}>
          <View style={{ marginBottom: SPACE['3xl'] }}>{greeting}</View>
          <View style={{ gap: SPACE['3xl'] }}>
            {todayFocus}
            {feedNotice}
          </View>
        </View>
      </AuthenticatedPageShell>
    );
  }

  return (
    <AuthenticatedPageShell>
      <View style={{ alignSelf: 'center', maxWidth: PAGE_MAX_WIDTH, minWidth: 0, width: '100%' }}>
        <View style={{ marginBottom: SPACE['3xl'] }}>{greeting}</View>

        {twoColumn ? (
          <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE['3xl'] }}>
            <View style={{ flexBasis: '33%', gap: SPACE['3xl'], maxWidth: 420, minWidth: 340 }}>
              {todayFocus}
              {sharedCard}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>{feed}</View>
          </View>
        ) : (
          <View style={{ gap: SPACE['3xl'] }}>
            {todayFocus}

            <View>
              <Typography accessibilityRole="header" variant="title" style={{ marginBottom: SPACE.xs }}>Shared with You</Typography>
              <Typography variant="caption" style={{ color: colors.text.secondary, marginBottom: SPACE.lg }}>
                {circles.sharedWithMe.length === 0
                  ? 'When a friend invites you to a Goal, accept it in Requests and it will appear here.'
                  : 'Goals friends invited you to view'}
              </Typography>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACE.lg }}>
                {circles.sharedWithMe.map((goal) => (
                  <SharedGoalTile goal={goal} key={goal.id} onPress={() => setOpenGoalId(goal.id)} ownerName={ownerName(goal)} />
                ))}
              </ScrollView>
            </View>

            {feed}
          </View>
        )}
      </View>

      <PersonSheet
        publicGoal={circles.publicGoals.find((goal) => goal.ownerId === openPersonId) ?? null}
        goals={circles.sharedWithMe.filter((goal) => goal.ownerId === openPersonId)}
        onClose={() => setOpenPersonId(null)}
        onOpenGoal={(goalId) => {
          setOpenPersonId(null);
          setOpenGoalId(goalId);
        }}
        onViewUpdates={() => {
          if (openPersonId) circles.setScope({ kind: 'person', personId: openPersonId });
          setOpenPersonId(null);
        }}
        person={openPerson}
        postCount={circles.posts.filter((post) => post.authorId === openPersonId).length}
      />
      <SharedGoalSheet
        goal={openGoal}
        onClose={() => setOpenGoalId(null)}
        onViewUpdates={() => {
          if (openGoalId) circles.setScope({ kind: 'goal', goalId: openGoalId });
          setOpenGoalId(null);
        }}
        owner={openGoalOwner}
      />
      <EncouragersModal postId={encouragersPostId} onClose={() => setEncouragersPostId(null)} />
    </AuthenticatedPageShell>
  );
}
