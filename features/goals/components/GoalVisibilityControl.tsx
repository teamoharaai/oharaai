import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { fetchFriendsSnapshot } from '@/features/friends/services/friends-service';
import type { PersonSummary } from '@/features/friends/types';
import type { GoalVisibilityChoice } from '../services/goal-visibility-service';

export function GoalVisibilityControl({ value, audience, onChange, onAudienceChange }: {
  value: GoalVisibilityChoice;
  audience: string[];
  onChange: (value: GoalVisibilityChoice) => void;
  onAudienceChange: (ids: string[]) => void;
}) {
  const colors = useThemeColors();
  const [friends, setFriends] = useState<PersonSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (value !== 'circle') return;
    let active = true;
    setError(null); setLoading(true);
    void fetchFriendsSnapshot().then((result) => { if (active) setFriends(result.friends); })
      .catch(() => { if (active) setError('Friends could not be loaded. Try again before sharing.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [value, retry]);
  return <View style={{ gap: 12 }}>
    <Typography variant="heading">Visibility</Typography>
    {([
      ['private', 'Private', 'Only you can see this Goal.'],
      ['circle', 'Circles', 'Invite specific accepted friends to view this Goal.'],
      ['public', 'Public', 'Your accepted OHARA friends can view this Goal. This replaces your current public Goal; it is not public on the web.'],
    ] as const).map(([id, label, description]) => <Pressable key={id} accessibilityRole="radio"
      accessibilityState={{ checked: value === id }} aria-checked={value === id} onPress={() => onChange(id)}
      style={{ padding: 14, borderWidth: 1, borderRadius: 12, borderColor: value === id ? colors.accent.primary : colors.border.divider }}>
      <Typography variant="emphasis-sm">{label}</Typography><Typography variant="body">{description}</Typography>
    </Pressable>)}
    {value === 'circle' ? <View style={{ gap: 8 }}>
      <Typography variant="caption">New viewers must accept their invitation. Private Vault content is never shared.</Typography>
      {error ? <Typography variant="body">{error}</Typography> : null}
      {loading ? <Typography variant="body">Loading accepted friends…</Typography> : null}
      {error ? <Pressable accessibilityRole="button" onPress={() => setRetry((value) => value + 1)}><Typography variant="body">Retry friends</Typography></Pressable> : null}
      {!friends.length && !error && !loading ? <Typography variant="body">No accepted friends available.</Typography> : null}
      {friends.map((friend) => <Pressable key={friend.id} accessibilityRole="checkbox"
        accessibilityState={{ checked: audience.includes(friend.id) }} aria-checked={audience.includes(friend.id)} style={{ padding: 12 }}
        onPress={() => onAudienceChange(audience.includes(friend.id) ? audience.filter((id) => id !== friend.id) : [...audience, friend.id])}>
        <Typography variant="body">{audience.includes(friend.id) ? '✓ ' : '○ '}{friend.display_name || friend.username}</Typography>
      </Pressable>)}
    </View> : null}
  </View>;
}
