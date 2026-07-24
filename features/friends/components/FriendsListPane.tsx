import { View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import type { PersonSummary } from '@/features/friends/types';
import { useThemeColors } from '@/store/uiStore';
import { FriendRow } from './FriendRow';

interface FriendsListPaneProps {
  friends: PersonSummary[];
  sentCount: number;
}

export function FriendsListPane({
  friends,
  sentCount,
}: FriendsListPaneProps) {
  const colors = useThemeColors();

  if (friends.length === 0) {
    return (
      <View style={{ gap: 6, padding: 28 }}>
        <Typography
          style={{ color: colors.text.primary }}
          variant="section-header"
        >
          Quiet in here.
        </Typography>
        <Typography
          style={{ color: colors.text.secondary, maxWidth: 350 }}
          variant="meta"
        >
          Add someone by @username, or accept a request. Only you can see this
          list.
        </Typography>
        {sentCount > 0 ? <SentNote count={sentCount} /> : null}
      </View>
    );
  }

  return (
    <View>
      {friends.map((friend) => (
        <FriendRow
          key={friend.id}
          avatarUrl={friend.avatar_url}
          displayName={friend.display_name || friend.username}
          subtitle={`@${friend.username}`}
        />
      ))}
      {sentCount > 0 ? (
        <View style={{ paddingHorizontal: 12, paddingTop: 14 }}>
          <SentNote count={sentCount} />
        </View>
      ) : null}
    </View>
  );
}

function SentNote({ count }: { count: number }) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        backgroundColor: colors.background.goalCard,
        borderColor: colors.border.warmSubtle,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 8,
        padding: 12,
      }}
    >
      <Typography style={{ color: colors.text.secondary }} variant="meta">
        <Typography variant="emphasis-sm">
          {count === 1 ? '1 sent request' : `${count} sent requests`}
        </Typography>{' '}
        still waiting for a response.
      </Typography>
    </View>
  );
}
