import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import {
  FRIENDS_SEARCH_DEBOUNCE_MS,
  FRIENDS_SEARCH_MAX_LENGTH,
  FRIENDS_SEARCH_MIN_LENGTH,
} from '@/features/friends/state-core';
import type {
  FriendMutationState,
  PersonSummary,
  SearchResult,
} from '@/features/friends/types';
import { useThemeColors } from '@/store/uiStore';
import { getFriendErrorCopy } from './copy';
import { FriendRow } from './FriendRow';

interface AddPeoplePaneProps {
  isSearchLoading: boolean;
  onQueryChange: (query: string) => void;
  onRetrySearch: () => void;
  onReviewRequests: () => void;
  onSend: (person: PersonSummary) => Promise<void>;
  searchError: string | null;
  searchQuery: string;
  searchResults: SearchResult[];
  sendMutations: Record<string, FriendMutationState>;
}

export function AddPeoplePane({
  isSearchLoading,
  onQueryChange,
  onRetrySearch,
  onReviewRequests,
  onSend,
  searchError,
  searchQuery,
  searchResults,
  sendMutations,
}: AddPeoplePaneProps) {
  const colors = useThemeColors();
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceHandleRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const hasSearchQuery =
    searchQuery.length >= FRIENDS_SEARCH_MIN_LENGTH;
  const isSearchPending = isDebouncing || isSearchLoading;

  useEffect(() => {
    return () => {
      if (debounceHandleRef.current) {
        clearTimeout(debounceHandleRef.current);
      }
    };
  }, []);

  function showDebounceProgress(): void {
    if (debounceHandleRef.current) {
      clearTimeout(debounceHandleRef.current);
    }
    setIsDebouncing(true);
    debounceHandleRef.current = setTimeout(() => {
      debounceHandleRef.current = null;
      setIsDebouncing(false);
    }, FRIENDS_SEARCH_DEBOUNCE_MS);
  }

  function clearDebounceProgress(): void {
    if (debounceHandleRef.current) {
      clearTimeout(debounceHandleRef.current);
      debounceHandleRef.current = null;
    }
    setIsDebouncing(false);
  }

  function handleQueryChange(value: string): void {
    const query = value.replace(/^@/, '');
    const normalizedQuery = query
      .trim()
      .slice(0, FRIENDS_SEARCH_MAX_LENGTH);
    if (
      normalizedQuery !== searchQuery
      && normalizedQuery.length >= FRIENDS_SEARCH_MIN_LENGTH
    ) {
      showDebounceProgress();
    } else if (normalizedQuery.length < FRIENDS_SEARCH_MIN_LENGTH) {
      clearDebounceProgress();
    }
    onQueryChange(query);
  }

  return (
    <View>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.background.input,
          borderColor: colors.border.input,
          borderRadius: 12,
          borderWidth: 1,
          flexDirection: 'row',
          gap: 9,
          marginBottom: 7,
          marginHorizontal: 12,
          marginTop: 14,
          minHeight: 46,
          paddingHorizontal: 13,
        }}
      >
        <Ionicons
          color={colors.text.muted}
          name="search-outline"
          size={18}
        />
        <TextInput
          accessibilityLabel="Search people by username"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={FRIENDS_SEARCH_MAX_LENGTH}
          onChangeText={handleQueryChange}
          placeholder="Search by @username"
          placeholderTextColor={colors.text.muted}
          style={{
            color: colors.text.primary,
            flex: 1,
            fontFamily: 'Inter-Regular',
            fontSize: 14,
            paddingVertical: 8,
          }}
          value={searchQuery}
        />
        {isSearchPending ? (
          <ActivityIndicator color={colors.text.muted} size="small" />
        ) : (
          <Typography
            style={{ color: colors.text.muted }}
            variant="caption"
          >
            3+ chars
          </Typography>
        )}
      </View>

      {!hasSearchQuery ? (
        <View style={{ gap: 5, padding: 28 }}>
          <Typography variant="section-header">Someone in mind?</Typography>
          <Typography
            style={{ color: colors.text.secondary, maxWidth: 350 }}
            variant="meta"
          >
            Type at least three characters of their @username. Search only
            matches the beginning of a username.
          </Typography>
        </View>
      ) : searchError ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ gap: 10, padding: 24 }}
        >
          <Typography
            style={{ color: colors.feedback.danger.text }}
            variant="meta"
          >
            {searchError}
          </Typography>
          <Button
            onPress={() => {
              showDebounceProgress();
              onRetrySearch();
            }}
            size="compact"
            style={{ alignSelf: 'flex-start' }}
            variant="secondary"
          >
            Try again
          </Button>
        </View>
      ) : !isSearchPending && searchResults.length === 0 ? (
        <View style={{ padding: 24 }}>
          <Typography
            accessibilityLiveRegion="polite"
            style={{ color: colors.text.secondary }}
            variant="meta"
          >
            No results for @{searchQuery}.
          </Typography>
        </View>
      ) : (
        <View>
          {searchResults.map((result) => {
            const mutation = sendMutations[result.id];
            const mutationError = mutation?.error
              ? getFriendErrorCopy(
                  mutation.error,
                  'Could not send this request.',
                )
              : null;

            return (
              <FriendRow
                key={result.id}
                action={
                  <RelationshipAction
                    isBusy={mutation?.isBusy ?? false}
                    onReview={onReviewRequests}
                    onSend={() => void onSend(result)}
                    relationship={result.relation}
                  />
                }
                avatarUrl={result.avatar_url}
                displayName={result.display_name || result.username}
                error={mutationError}
                subtitle={`@${result.username}`}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

function RelationshipAction({
  isBusy,
  onReview,
  onSend,
  relationship,
}: {
  isBusy: boolean;
  onReview: () => void;
  onSend: () => void;
  relationship: SearchResult['relation'];
}) {
  const colors = useThemeColors();

  switch (relationship) {
    case 'none':
      return (
        <Button
          disabled={isBusy}
          loading={isBusy}
          onPress={onSend}
          size="compact"
          style={{ minHeight: 38, minWidth: 68, paddingHorizontal: 13 }}
        >
          Add
        </Button>
      );
    case 'pending_in':
      return (
        <Button
          onPress={onReview}
          size="compact"
          style={{ minHeight: 38, paddingHorizontal: 13 }}
          variant="secondary"
        >
          Review
        </Button>
      );
    case 'pending_out':
      return (
        <StatusPill label="Pending" />
      );
    case 'friends':
      return (
        <StatusPill
          accent
          icon="checkmark"
          label="Friends"
        />
      );
    case 'self':
      return <StatusPill label="You" />;
  }
}

function StatusPill({
  accent = false,
  icon,
  label,
}: {
  accent?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  const colors = useThemeColors();

  return (
    <View
      accessibilityLabel={label}
      accessible
      style={{
        alignItems: 'center',
        backgroundColor: accent
          ? colors.background.selectedRow
          : colors.background.input,
        borderColor: accent
          ? colors.border.accent
          : colors.border.divider,
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 4,
        minHeight: 32,
        paddingHorizontal: 11,
      }}
    >
      {icon ? (
        <Ionicons color={colors.text.accent} name={icon} size={13} />
      ) : null}
      <Typography
        style={{ color: accent ? colors.text.accent : colors.text.muted }}
        variant="badge-text"
      >
        {label}
      </Typography>
    </View>
  );
}
