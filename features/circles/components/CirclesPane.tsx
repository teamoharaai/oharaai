import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { FEATURES } from '@/constants/features';
import { useThemeColors } from '@/store/uiStore';
import { firstName, toCategory } from '../format';
import { useCircles } from '../hooks/useCircles';
import type { CirclesAuthor, LinkableItem } from '../types';
import { CategoryGlyph, PersonAvatar, PressableRow } from './primitives';

type LinkableGoal = Extract<LinkableItem, { kind: 'goal' }>;

function categoryLabel(category: string): string {
  const value = toCategory(category);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function SectionTitle({ title, copy }: { title: string; copy: string }) {
  const colors = useThemeColors();
  return (
    <View style={{ marginBottom: SPACE.lg }}>
      <Typography accessibilityRole="header" variant="title">{title}</Typography>
      <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: 2 }}>{copy}</Typography>
    </View>
  );
}

function ViewOnlyNote() {
  const colors = useThemeColors();
  return (
    <View
      style={{
        alignItems: 'flex-start',
        backgroundColor: colors.background.subtle,
        borderRadius: RADIUS.md,
        flexDirection: 'row',
        gap: SPACE.sm,
        marginTop: SPACE.lg,
        padding: SPACE.lg,
      }}
    >
      <Ionicons color={colors.text.secondary} name="eye-outline" size={15} style={{ marginTop: 1 }} />
      <Typography variant="caption" style={{ color: colors.text.secondary, flex: 1 }}>
        View only. Friends see the title, milestone titles, progress, and this week’s Task count — never
        your notes, reflections, Entries, or Vault.
      </Typography>
    </View>
  );
}

function GoalOption({ goal, selected, onPress }: { goal: LinkableGoal; selected: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  const category = toCategory(goal.category);
  return (
    <PressableRow accessibilityLabel={goal.title} onPress={onPress} selected={selected}>
      <CategoryGlyph category={category} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Typography numberOfLines={1} variant="emphasis-sm">{goal.title}</Typography>
        <Typography variant="meta" style={{ color: colors.text.secondary }}>{categoryLabel(goal.category)}</Typography>
      </View>
      <Ionicons
        color={selected ? colors.text.accent : colors.text.muted}
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={18}
      />
    </PressableRow>
  );
}

/** Optional: make exactly one Goal visible to all friends. Click → list → pick → Confirm. */
function PublicGoalSection() {
  const colors = useThemeColors();
  const { myGoals, myPublicGoal, setMyPublicGoal } = useCircles();
  const [picking, setPicking] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(myPublicGoal?.id ?? null);
  const currentId = myPublicGoal?.id ?? null;

  function startPicking() {
    setPendingId(currentId);
    setPicking(true);
  }

  if (picking) {
    return (
      <View>
        <Typography variant="meta" style={{ color: colors.text.muted, marginBottom: SPACE.xs }}>
          Choose one Goal
        </Typography>
        {myGoals.map((goal) => (
          <GoalOption goal={goal} key={goal.id} onPress={() => setPendingId(goal.id)} selected={pendingId === goal.id} />
        ))}
        <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.xl }}>
          <Button
            disabled={!pendingId || pendingId === currentId}
            onPress={() => {
              void setMyPublicGoal(pendingId);
              setPicking(false);
            }}
            size="compact"
          >
            Confirm
          </Button>
          <Button onPress={() => setPicking(false)} size="compact" textStyle={{ color: colors.text.primary }} variant="outline">
            Cancel
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View>
      {myPublicGoal ? (
        <View
          style={{
            alignItems: 'center',
            borderColor: colors.border.accent,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            flexDirection: 'row',
            gap: SPACE.lg,
            padding: SPACE.lg,
          }}
        >
          <CategoryGlyph category={toCategory(myPublicGoal.category)} size={40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.xs }}>
              <Ionicons color={colors.text.accent} name="globe-outline" size={13} />
              <Typography variant="meta" style={{ color: colors.text.accent }}>Public to all friends</Typography>
            </View>
            <Typography numberOfLines={1} variant="emphasis-sm" style={{ fontSize: 15 }}>{myPublicGoal.title}</Typography>
          </View>
        </View>
      ) : (
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
          <Ionicons color={colors.text.muted} name="lock-closed-outline" size={15} />
          <Typography variant="body-small" style={{ color: colors.text.secondary }}>All your Goals are private.</Typography>
        </View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: SPACE.lg }}>
        <Button onPress={startPicking} size="compact" variant={myPublicGoal ? 'outline' : 'primary'} textStyle={myPublicGoal ? { color: colors.text.primary } : undefined}>
          {myPublicGoal ? 'Change' : 'Choose a public goal'}
        </Button>
        {myPublicGoal ? (
          <Button onPress={() => void setMyPublicGoal(null)} size="compact" textStyle={{ color: colors.text.primary }} variant="outline">
            Make private
          </Button>
        ) : null}
      </View>
    </View>
  );
}

/** Invite specific friends to one Goal; they accept or decline in Requests. */
function InviteToGoalSection() {
  const colors = useThemeColors();
  const { myGoals, friends, sentInvites, sendInviteToGoal, withdrawInvitesForGoal } = useCircles();
  const [goalId, setGoalId] = useState<string | null>(null);
  const [invitees, setInvitees] = useState<string[]>([]);
  const goal = myGoals.find((item) => item.id === goalId);

  const goalTitleById = (id: string) => myGoals.find((item) => item.id === id)?.title ?? 'A goal';
  const sentByGoal = sentInvites.reduce<Record<string, CirclesAuthor[]>>((acc, invite) => {
    if (!invite.invitee) return acc;
    (acc[invite.goalId] ??= []).push(invite.invitee);
    return acc;
  }, {});

  return (
    <View>
      <Typography variant="meta" style={{ color: colors.text.muted, marginBottom: SPACE.xs }}>Goal</Typography>
      {myGoals.length === 0 ? (
        <Typography variant="caption" style={{ color: colors.text.secondary }}>No shareable Goals yet.</Typography>
      ) : null}
      {myGoals.map((item) => (
        <GoalOption goal={item} key={item.id} onPress={() => setGoalId(item.id)} selected={goalId === item.id} />
      ))}
      <Typography variant="meta" style={{ color: colors.text.muted, marginBottom: SPACE.md, marginTop: SPACE.xl }}>Invite</Typography>
      {friends.length === 0 ? (
        <Typography variant="caption" style={{ color: colors.text.secondary }}>Add friends to invite them to a Goal.</Typography>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
        {friends.map((person) => {
          const selected = invitees.includes(person.id);
          return (
            <Pressable
              accessibilityLabel={person.displayName}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              key={person.id}
              onPress={() => setInvitees((current) => (
                selected ? current.filter((id) => id !== person.id) : [...current, person.id]
              ))}
              style={{
                alignItems: 'center',
                backgroundColor: selected ? colors.background.selectedRow : colors.background.card,
                borderColor: selected ? colors.border.accent : colors.border.warm,
                borderRadius: RADIUS.round,
                borderWidth: 1,
                flexDirection: 'row',
                gap: SPACE.sm,
                paddingLeft: SPACE.xs,
                paddingRight: SPACE.lg,
                paddingVertical: SPACE.xs,
              }}
            >
              <PersonAvatar person={person} size={26} />
              <Typography variant="label" style={{ color: selected ? colors.text.primary : colors.text.secondary }}>
                {firstName(person)}
              </Typography>
            </Pressable>
          );
        })}
      </View>
      <Button
        disabled={!goal || invitees.length === 0}
        onPress={() => {
          if (!goal) return;
          const selected = friends.filter((person) => invitees.includes(person.id));
          void sendInviteToGoal(goal.id, selected);
          setGoalId(null);
          setInvitees([]);
        }}
        style={{ alignSelf: 'flex-start', marginTop: SPACE.xl }}
      >
        Send invitation
      </Button>

      {Object.keys(sentByGoal).length > 0 ? (
        <View style={{ marginTop: SPACE['2xl'] }}>
          <Typography variant="meta" style={{ color: colors.text.muted, marginBottom: SPACE.sm }}>Invitations sent</Typography>
          {Object.entries(sentByGoal).map(([sentGoalId, people]) => (
            <View key={sentGoalId} style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md, minHeight: 48 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Typography numberOfLines={1} variant="emphasis-sm">{goalTitleById(sentGoalId)}</Typography>
                <Typography numberOfLines={1} variant="meta" style={{ color: colors.text.secondary }}>
                  Pending · {people.map((person) => firstName(person)).filter(Boolean).join(', ')}
                </Typography>
              </View>
              <Button
                onPress={() => void withdrawInvitesForGoal(sentGoalId)}
                size="compact"
                textStyle={{ color: colors.text.primary }}
                variant="outline"
              >
                Withdraw
              </Button>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * "Circles" — the user's sharing boundaries, shown from the profile panel.
 * Everything is private by default.
 */
export function CirclesPane() {
  const colors = useThemeColors();

  if (!FEATURES.CIRCLES_ENABLED) {
    return (
      <View style={{ padding: SPACE['3xl'] }}>
        <Typography variant="caption" style={{ color: colors.text.secondary }}>
          Circles isn’t available yet.
        </Typography>
      </View>
    );
  }

  return (
    <View style={{ gap: SPACE['3xl'], padding: SPACE['3xl'] }}>
      <View>
        <SectionTitle
          title="Public goal"
          copy="Optional. Choose one Goal every friend can view. Everything else stays private."
        />
        <PublicGoalSection />
      </View>
      <View style={{ backgroundColor: colors.border.warmSubtle, height: 1 }} />
      <View>
        <SectionTitle
          title="Invite to a Goal"
          copy="Let specific friends view a Goal. They’ll get a request to accept or decline."
        />
        <InviteToGoalSection />
      </View>
      <ViewOnlyNote />
    </View>
  );
}
