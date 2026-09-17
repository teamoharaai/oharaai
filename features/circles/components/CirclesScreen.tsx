import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthenticatedPageShell } from '@/components/layout/AuthenticatedPageShell';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { useCircles } from '../hooks/useCircles';
import { milestoneLabel, milestoneProgress } from '../progress';
import type { FeedFilter, SharedGoal } from '../types';
import { SharedWithYouCard } from './ContextCards';
import { PersonSheet, SharedGoalSheet } from './CirclesSheets';
import { FeedPostCard } from './FeedPostCard';
import { PostComposer } from './PostComposer';
import { CategoryGlyph, ProgressTrack, useCategoryTone } from './primitives';

const FILTER_OPTIONS: { value: FeedFilter; label: string }[] = [
  { value: 'all', label: 'All updates' },
  { value: 'reflections', label: 'Reflections' },
  { value: 'milestones', label: 'Milestones' },
  { value: 'completed', label: 'Completed' },
];

/** Two columns from here up; below, context collapses above the feed. */
const TWO_COLUMN_MIN_WIDTH = 1080;
const PAGE_MAX_WIDTH = 1280;

function SharedGoalTile({ goal, ownerName, onPress }: { goal: SharedGoal; ownerName: string; onPress: () => void }) {
  const colors = useThemeColors();
  const tone = useCategoryTone(goal.category);
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
      <CategoryGlyph category={goal.category} size={36} />
      <View>
        <Typography numberOfLines={1} variant="emphasis-sm" style={{ fontSize: 15 }}>{goal.title}</Typography>
        <Typography numberOfLines={1} variant="caption" style={{ color: colors.text.secondary }}>Shared by {ownerName}</Typography>
      </View>
      <ProgressTrack color={tone.fg} value={progress.ratio ?? 0} />
      <Typography variant="meta" style={{ color: colors.text.muted }}>{milestoneLabel(progress)}</Typography>
    </Pressable>
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

  const openPerson = circles.people.find((person) => person.id === openPersonId) ?? null;
  const viewableGoals = [...circles.sharedWithMe, ...circles.publicGoals];
  const openGoal = viewableGoals.find((goal) => goal.id === openGoalId) ?? null;
  const openGoalOwner = openGoal ? circles.people.find((person) => person.id === openGoal.ownerId) ?? null : null;
  const scope = circles.scope;
  const scopeLabel = scope.kind === 'person'
    ? `${circles.people.find((person) => person.id === scope.personId)?.firstName ?? ''}’s updates`
    : scope.kind === 'goal'
      ? viewableGoals.find((goal) => goal.id === scope.goalId)?.title ?? ''
      : null;
  const selectedGoalId = scope.kind === 'goal' ? scope.goalId : null;
  const ownerName = (goal: SharedGoal) => circles.people.find((person) => person.id === goal.ownerId)?.firstName ?? '';

  const sharedCard = (
    <SharedWithYouCard
      expanded={sharedExpanded}
      goals={circles.sharedWithMe}
      onSelectGoal={setOpenGoalId}
      onToggleExpanded={() => setSharedExpanded((value) => !value)}
      people={circles.people}
      selectedGoalId={selectedGoalId}
    />
  );

  const feed = (
    <View style={{ gap: SPACE['3xl'], minWidth: 0 }}>
      {feedNotice}
      <PostComposer
        compact={compact}
        myGoals={circles.myGoals}
        myReflections={circles.myReflections}
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
          onAddComment={(body) => circles.addComment(post.id, body)}
          onEncourage={() => circles.toggleEncourage(post.id)}
          onOpenPerson={setOpenPersonId}
          onSave={() => circles.toggleSave(post.id)}
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
        onToggleFollowing={() => openPersonId && circles.toggleFollowing(openPersonId)}
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
    </AuthenticatedPageShell>
  );
}
