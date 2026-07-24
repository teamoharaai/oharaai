// Add-people tab content — username search with a 250 ms debounce and the
// four row states (Add / Pending / Friends / You). The 3-char minimum is
// enforced in three places: this input (short-circuits the debounce), the
// api client (short-circuits the fetch), and the RPC (source of truth).

import { useEffect, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useThemeColors } from '@/store/uiStore';
import { useFriendsStore } from '@/features/friends/store';
import { searchPeople } from '@/features/friends/api';
import type { SearchResult } from '@/features/friends/types';
import { FriendRow } from './FriendRow';

const DEBOUNCE_MS = 250;

export function AddPeoplePane() {
  const colors = useThemeColors();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const optimisticSend = useFriendsStore((s) => s.optimisticSend);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }
    setIsSearching(true);
    const handle = setTimeout(async () => {
      try {
        const rows = await searchPeople(q);
        setResults(rows);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed.');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <View style={{ paddingHorizontal: 12 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border.warm,
          backgroundColor: colors.background.input,
          marginBottom: 8,
        }}
      >
        <Typography variant="meta" style={{ color: colors.text.muted }}>⌕</Typography>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by @username"
          placeholderTextColor={colors.text.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            fontFamily: 'Inter-Regular',
            fontSize: 14.5,
            color: colors.text.primary,
            paddingVertical: 2,
          }}
        />
        {isSearching ? (
          <ActivityIndicator size="small" color={colors.text.muted} />
        ) : (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border.warmSubtle,
              backgroundColor: colors.background.card,
            }}
          >
            <Typography variant="caption" style={{ color: colors.text.muted }}>
              3+ chars · exact match
            </Typography>
          </View>
        )}
      </View>

      {query.trim().length < 3 ? (
        <View style={{ padding: 20, gap: 4 }}>
          <Typography variant="card-title" style={{ color: colors.text.primary, fontStyle: 'italic' }}>
            Someone in mind?
          </Typography>
          <Typography variant="meta" style={{ color: colors.text.secondary, maxWidth: 360 }}>
            Type their @username — at least three letters. We match exact and beginning-of-name only.
          </Typography>
        </View>
      ) : error ? (
        <View style={{ padding: 20 }}>
          <Typography variant="meta" style={{ color: colors.feedback.danger.text }}>
            {error}
          </Typography>
        </View>
      ) : results.length === 0 && !isSearching ? (
        <View style={{ padding: 20 }}>
          <Typography variant="meta" style={{ color: colors.text.secondary }}>
            No match for @{query.trim()} — usernames are case-insensitive.
          </Typography>
        </View>
      ) : (
        results.map((row) => (
          <FriendRow
            key={row.id}
            avatarUrl={row.avatar_url}
            displayName={row.display_name || row.username}
            subtitle={`@${row.username}`}
            disabled={row.relation === 'self'}
            action={
              <RelationAction
                row={row}
                busy={busyId === row.id}
                onSend={async () => {
                  setBusyId(row.id);
                  try {
                    await optimisticSend(row);
                  } finally {
                    setBusyId(null);
                  }
                }}
              />
            }
          />
        ))
      )}
    </View>
  );
}

function RelationAction({
  row,
  busy,
  onSend,
}: {
  row: SearchResult;
  busy: boolean;
  onSend: () => void;
}) {
  const colors = useThemeColors();

  switch (row.relation) {
    case 'friends':
      return (
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: colors.accent.tealSubtle,
          }}
        >
          <Typography variant="badge-text" style={{ color: colors.accent.tealMid }}>
            ✓ Friends
          </Typography>
        </View>
      );
    case 'pending_out':
    case 'pending_in':
      return (
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border.warm,
          }}
        >
          <Typography variant="badge-text" style={{ color: colors.text.muted }}>
            Pending
          </Typography>
        </View>
      );
    case 'self':
      return (
        <Typography variant="badge-text" style={{ color: colors.text.muted, letterSpacing: 0.4 }}>
          YOU
        </Typography>
      );
    case 'none':
    default:
      return (
        <Button size="compact" variant="primary" onPress={onSend} disabled={busy}>
          {busy ? 'Sending…' : '+ Add'}
        </Button>
      );
  }
}
