// Requests tab content — incoming pending only, with two inline actions
// (Accept prominent, Decline quiet). Sent-but-unanswered surfaces as a
// footnote below, not its own list; that mirrors the design brief and keeps
// the pane focused on the thing the viewer actually has to act on.

import { View } from 'react-native';
import { useState } from 'react';
import { Typography } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useThemeColors } from '@/store/uiStore';
import { useFriendsStore } from '@/features/friends/store';
import { FriendRow } from './FriendRow';

export function RequestsPane() {
  const colors = useThemeColors();
  const incoming = useFriendsStore((s) => s.incoming_requests);
  const sent = useFriendsStore((s) => s.sent_requests);
  const accept = useFriendsStore((s) => s.optimisticAccept);
  const decline = useFriendsStore((s) => s.optimisticDecline);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (incoming.length === 0) {
    return (
      <View style={{ padding: 32, gap: 6 }}>
        <Typography
          variant="section-header"
          style={{ color: colors.text.primary, fontStyle: 'italic', fontFamily: 'Inter-SemiBold' }}
        >
          Nothing to answer yet.
        </Typography>
        <Typography variant="meta" style={{ color: colors.text.secondary, maxWidth: 340 }}>
          When someone sends you a request, it'll wait for you here.
        </Typography>
        {sent.length > 0 ? <SentFootnote count={sent.length} /> : null}
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 12 }}>
      {incoming.map((request) => (
        <FriendRow
          key={request.id}
          avatarUrl={request.from.avatar_url}
          displayName={request.from.display_name || request.from.username}
          subtitle={`@${request.from.username}`}
          action={
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                size="compact"
                variant="primary"
                disabled={busyId === request.id}
                onPress={async () => {
                  setBusyId(request.id);
                  try {
                    await accept(request);
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                Accept
              </Button>
              <Button
                size="compact"
                variant="secondary"
                disabled={busyId === request.id}
                onPress={async () => {
                  setBusyId(request.id);
                  try {
                    await decline(request);
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                Decline
              </Button>
            </View>
          }
        />
      ))}
      {sent.length > 0 ? <SentFootnote count={sent.length} /> : null}
    </View>
  );
}

function SentFootnote({ count }: { count: number }) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        borderTopWidth: 1,
        borderColor: colors.border.warmSubtle,
        backgroundColor: colors.background.goalCard,
      }}
    >
      <Typography variant="meta" style={{ color: colors.text.secondary }}>
        <Typography variant="emphasis-sm">
          {count === 1 ? '1 request you sent' : `${count} requests you sent`}
        </Typography>{' '}
        · waiting on their end.
      </Typography>
    </View>
  );
}
