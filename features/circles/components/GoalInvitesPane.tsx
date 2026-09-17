import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { personById } from '../fixtures';
import { milestoneLabel, milestoneProgress } from '../progress';
import { useCirclesStore } from '../store';
import { CategoryGlyph, PersonAvatar } from './primitives';

export function useGoalInviteCount(): number {
  return useCirclesStore((state) => state.goalInvites.length);
}

/**
 * Goal invitations, shown inside Requests. Accepting adds the Goal to
 * "Shared with You" on Home; declining removes it silently.
 * PROTOTYPE: in-memory only; the inviter is not notified.
 */
export function GoalInvitesPane() {
  const colors = useThemeColors();
  const invites = useCirclesStore((state) => state.goalInvites);
  const acceptInvite = useCirclesStore((state) => state.acceptInvite);
  const declineInvite = useCirclesStore((state) => state.declineInvite);

  if (invites.length === 0) return null;

  return (
    <View style={{ gap: SPACE.md, paddingHorizontal: 12, paddingTop: 14 }}>
      <Typography variant="meta" style={{ color: colors.text.muted, paddingHorizontal: SPACE.xs }}>
        Goal invitations
      </Typography>
      {invites.map((invite) => {
        const owner = personById(invite.goal.ownerId);
        return (
          <View
            key={invite.id}
            style={{
              backgroundColor: colors.background.subtle,
              borderColor: colors.border.warmSubtle,
              borderRadius: RADIUS.md,
              borderWidth: 1,
              gap: SPACE.md,
              padding: SPACE.lg,
            }}
          >
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
              <PersonAvatar person={owner} size={24} />
              <Typography numberOfLines={1} variant="caption" style={{ color: colors.text.secondary, flex: 1 }}>
                {owner.firstName} invited you to view a Goal · {invite.sentLabel}
              </Typography>
            </View>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
              <CategoryGlyph category={invite.goal.category} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Typography numberOfLines={1} variant="emphasis-sm" style={{ fontSize: 15 }}>{invite.goal.title}</Typography>
                <Typography variant="meta" style={{ color: colors.text.secondary }}>
                  {milestoneLabel(milestoneProgress(invite.goal.milestones))}
                </Typography>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
              <Button
                onPress={() => acceptInvite(invite.id)}
                size="compact"
                style={{ minHeight: 38, paddingHorizontal: 14 }}
              >
                Accept
              </Button>
              <Button
                onPress={() => declineInvite(invite.id)}
                size="compact"
                style={{ minHeight: 38, paddingHorizontal: 14 }}
                textStyle={{ color: colors.text.primary }}
                variant="outline"
              >
                Decline
              </Button>
            </View>
          </View>
        );
      })}
    </View>
  );
}
