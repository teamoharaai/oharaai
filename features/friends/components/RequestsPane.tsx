import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import type {
  FriendMutationState,
  IncomingRequest,
} from '@/features/friends/types';
import { useThemeColors } from '@/store/uiStore';
import { getFriendErrorCopy } from './copy';
import { FriendRow } from './FriendRow';

interface RequestsPaneProps {
  connectionMutations: Record<string, FriendMutationState>;
  incomingRequests: IncomingRequest[];
  onAccept: (connectionId: string) => Promise<void>;
  onDecline: (connectionId: string) => Promise<void>;
  sentCount: number;
}

export function RequestsPane({
  connectionMutations,
  incomingRequests,
  onAccept,
  onDecline,
  sentCount,
}: RequestsPaneProps) {
  const colors = useThemeColors();
  const [retainedRequests, setRetainedRequests] = useState<
    Record<string, IncomingRequest>
  >({});
  const displayedRequests = useMemo(() => {
    const currentIds = new Set(
      incomingRequests.map((request) => request.id),
    );
    return [
      ...incomingRequests,
      ...Object.values(retainedRequests).filter(
        (request) => !currentIds.has(request.id),
      ),
    ].sort(
      (left, right) =>
        new Date(right.created_at).getTime()
        - new Date(left.created_at).getTime(),
    );
  }, [incomingRequests, retainedRequests]);

  async function runMutation(
    request: IncomingRequest,
    action: (connectionId: string) => Promise<void>,
  ): Promise<void> {
    setRetainedRequests((current) => ({
      ...current,
      [request.id]: request,
    }));
    try {
      await action(request.id);
    } finally {
      setRetainedRequests((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
    }
  }

  if (displayedRequests.length === 0) {
    return (
      <View style={{ gap: 6, padding: 28 }}>
        <Typography
          style={{ color: colors.text.primary }}
          variant="section-header"
        >
          Nothing to answer yet.
        </Typography>
        <Typography
          style={{ color: colors.text.secondary, maxWidth: 350 }}
          variant="meta"
        >
          When someone sends you a request, it will wait for you here.
        </Typography>
        {sentCount > 0 ? (
          <Typography
            style={{
              color: colors.text.secondary,
              marginTop: 10,
            }}
            variant="meta"
          >
            {sentCount === 1
              ? '1 request you sent is still pending.'
              : `${sentCount} requests you sent are still pending.`}
          </Typography>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      {displayedRequests.map((request) => {
        const mutation = connectionMutations[request.id];
        const isBusy = mutation?.isBusy ?? false;
        const error = mutation?.error
          ? getFriendErrorCopy(
              mutation.error,
              'Could not update this request.',
            )
          : null;

        return (
          <FriendRow
            key={request.id}
            action={
              isBusy ? (
                <View
                  accessibilityLiveRegion="polite"
                  accessibilityLabel="Updating request"
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 7,
                    paddingHorizontal: 8,
                  }}
                >
                  <ActivityIndicator
                    color={colors.text.muted}
                    size="small"
                  />
                  <Typography variant="caption">Updating</Typography>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 7 }}>
                  <Button
                    accessibilityLabel={`Accept request from ${
                      request.from.display_name || request.from.username
                    }`}
                    onPress={() =>
                      void runMutation(request, onAccept)
                    }
                    size="compact"
                    style={{ minHeight: 38, paddingHorizontal: 13 }}
                  >
                    Accept
                  </Button>
                  <Button
                    accessibilityLabel={`Decline request from ${
                      request.from.display_name || request.from.username
                    }`}
                    onPress={() =>
                      void runMutation(request, onDecline)
                    }
                    size="compact"
                    style={{ minHeight: 38, paddingHorizontal: 13 }}
                    variant="secondary"
                  >
                    Decline
                  </Button>
                </View>
              )
            }
            avatarUrl={request.from.avatar_url}
            displayName={request.from.display_name || request.from.username}
            error={error}
            subtitle={`@${request.from.username}`}
          />
        );
      })}
    </View>
  );
}
