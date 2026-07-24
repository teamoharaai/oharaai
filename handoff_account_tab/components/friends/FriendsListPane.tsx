// Friends tab content — the accepted-connections list plus a private-only note
// footer that mentions any sent-but-pending request.

import { View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { useFriendsStore } from '@/features/friends/store';
import { FriendRow } from './FriendRow';

interface FriendsListPaneProps {
  onOpenProfile: (id: string) => void;
}

export function FriendsListPane({ onOpenProfile }: FriendsListPaneProps) {
  const colors = useThemeColors();
  const friends = useFriendsStore((s) => s.friends);
  const sentRequests = useFriendsStore((s) => s.sent_requests);
  const isLoading = useFriendsStore((s) => s.isLoading);

  if (!isLoading && friends.length === 0) {
    return (
      <EmptyState
        title="Quiet in here."
        body="Add someone by @username, or accept a request. Only you ever see this list."
      />
    );
  }

  return (
    <View style={{ paddingHorizontal: 12 }}>
      {friends.map((friend) => (
        <FriendRow
          key={friend.id}
          avatarUrl={friend.avatar_url}
          displayName={friend.display_name || friend.username}
          subtitle={`@${friend.username}`}
          onPress={() => onOpenProfile(friend.id)}
          action={<Chevron color={colors.text.muted} />}
        />
      ))}

      {sentRequests.length > 0 ? (
        <View
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: 12,
            borderTopWidth: 1,
            borderColor: colors.border.warmSubtle,
            backgroundColor: colors.background.goalCard,
          }}
        >
          <Typography variant="meta" style={{ color: colors.text.secondary }}>
            <Typography variant="emphasis-sm">
              {sentRequests.length === 1
                ? '1 request you sent'
                : `${sentRequests.length} requests you sent`}
            </Typography>{' '}
            · still waiting on their end.
          </Typography>
        </View>
      ) : null}
    </View>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  const colors = useThemeColors();
  return (
    <View style={{ padding: 32, alignItems: 'flex-start', gap: 6 }}>
      <Typography
        variant="section-header"
        style={{ color: colors.text.primary, fontFamily: 'Inter-SemiBold', fontStyle: 'italic' }}
      >
        {title}
      </Typography>
      <Typography variant="meta" style={{ color: colors.text.secondary, maxWidth: 340 }}>
        {body}
      </Typography>
    </View>
  );
}

function Chevron({ color }: { color: string }) {
  return (
    <Typography variant="caption" style={{ color, fontSize: 15 }}>
      ›
    </Typography>
  );
}
