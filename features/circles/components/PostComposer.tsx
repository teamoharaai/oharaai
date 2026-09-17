import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE, TYPE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { CirclesAuthor, LinkableItem } from '../types';
import { PersonAvatar, PressableRow, QuietAction } from './primitives';

type LinkKind = LinkableItem['kind'];

const LINK_KIND_OPTIONS: { value: LinkKind; label: string }[] = [
  { value: 'goal', label: 'Goal' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'reflection', label: 'Reflection' },
];

const MAX_LINK_DESCRIPTION = 280;

/** The suggested description a link starts with (author edits before posting, CD-005). */
function suggestedDescription(link: LinkableItem): string {
  if (link.kind === 'milestone') return `Part of ${link.goalTitle}`;
  return link.description ?? '';
}

export function PostComposer({
  compact,
  me,
  myGoals,
  myReflections,
  myMilestones,
  onPublish,
}: {
  compact: boolean;
  me: CirclesAuthor | null;
  myGoals: Extract<LinkableItem, { kind: 'goal' }>[];
  myReflections: Extract<LinkableItem, { kind: 'reflection' }>[];
  myMilestones: Extract<LinkableItem, { kind: 'milestone' }>[];
  onPublish: (input: { body: string; link: LinkableItem | null; linkDescription: string | null }) => void;
}) {
  const colors = useThemeColors();
  const [body, setBody] = useState('');
  const [focused, setFocused] = useState(false);
  const [link, setLink] = useState<LinkableItem | null>(null);
  const [linkDescription, setLinkDescription] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState<LinkKind>('goal');
  const canPost = body.trim().length > 0;

  // When a link is chosen, seed the editable description with the suggestion.
  useEffect(() => {
    setLinkDescription(link ? suggestedDescription(link) : '');
  }, [link]);

  const options = useMemo<LinkableItem[]>(() => {
    if (pickerKind === 'goal') return myGoals;
    if (pickerKind === 'milestone') return myMilestones;
    return myReflections;
  }, [myGoals, myMilestones, myReflections, pickerKind]);

  function publish() {
    if (!canPost) return;
    const trimmedDescription = linkDescription.trim();
    onPublish({
      body: body.trim(),
      link,
      linkDescription: link && trimmedDescription ? trimmedDescription : null,
    });
    setBody('');
    setLink(null);
    setLinkDescription('');
    setPickerOpen(false);
  }

  return (
    <Card elevated padding="spacious">
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.lg }}>
        {compact ? null : (
          <PersonAvatar person={me ?? { displayName: 'You', username: '', avatarUrl: null }} size={44} />
        )}
        <View style={{ flex: 1, gap: SPACE.lg, minWidth: 0 }}>
          <TextInput
            accessibilityLabel="Write an update for your circles"
            multiline
            onBlur={() => setFocused(false)}
            onChangeText={setBody}
            onFocus={() => setFocused(true)}
            placeholder="What’s on your mind?"
            placeholderTextColor={colors.text.muted}
            style={{
              ...TYPE.body,
              backgroundColor: colors.background.input,
              borderColor: focused ? colors.border.accent : colors.border.input,
              borderRadius: RADIUS.md,
              borderWidth: 1,
              color: colors.text.primary,
              minHeight: focused || body ? 96 : 52,
              paddingHorizontal: SPACE.xl,
              paddingVertical: 14,
              textAlignVertical: 'top',
              // RN web: drop the browser focus ring; the border carries focus.
              outlineStyle: 'none',
            } as never}
            value={body}
          />

          {link ? (
            <View
              style={{
                backgroundColor: colors.background.subtle,
                borderColor: colors.border.warmSubtle,
                borderRadius: RADIUS.md,
                borderWidth: 1,
                gap: SPACE.md,
                padding: SPACE.lg,
              }}
            >
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
                <Ionicons color={colors.text.accent} name="link-outline" size={18} />
                <Typography numberOfLines={1} variant="emphasis-sm" style={{ flex: 1 }}>{link.title}</Typography>
                <Pressable
                  accessibilityLabel="Remove link"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setLink(null)}
                  style={{ padding: SPACE.xs }}
                >
                  <Ionicons color={colors.text.secondary} name="close" size={16} />
                </Pressable>
              </View>
              <TextInput
                accessibilityLabel="Description shared with this link"
                multiline
                maxLength={MAX_LINK_DESCRIPTION}
                onChangeText={setLinkDescription}
                placeholder="Add a short description to share"
                placeholderTextColor={colors.text.muted}
                style={{
                  ...TYPE.bodySmall,
                  backgroundColor: colors.background.input,
                  borderColor: colors.border.input,
                  borderRadius: RADIUS.sm,
                  borderWidth: 1,
                  color: colors.text.primary,
                  minHeight: 44,
                  paddingHorizontal: SPACE.lg,
                  paddingVertical: SPACE.md,
                  textAlignVertical: 'top',
                  outlineStyle: 'none',
                } as never}
                value={linkDescription}
              />
              <Typography variant="meta" style={{ color: colors.text.muted }}>
                Only the title and this description are shared. {MAX_LINK_DESCRIPTION - linkDescription.length} left.
              </Typography>
            </View>
          ) : null}

          {pickerOpen ? (
            <View
              style={{
                backgroundColor: colors.background.card,
                borderColor: colors.border.warm,
                borderRadius: RADIUS.md,
                borderWidth: 1,
                gap: SPACE.sm,
                paddingHorizontal: SPACE.lg,
                paddingVertical: SPACE.lg,
              }}
            >
              <View style={{ flexDirection: 'row' }}>
                <SegmentedControl
                  accessibilityLabel="What to link"
                  compact
                  onChange={setPickerKind}
                  options={LINK_KIND_OPTIONS}
                  value={pickerKind}
                />
              </View>
              {options.length === 0 ? (
                <Typography variant="caption" style={{ color: colors.text.secondary, paddingVertical: SPACE.md }}>
                  Nothing to link yet.
                </Typography>
              ) : options.map((option) => (
                <PressableRow
                  accessibilityLabel={`Link ${option.title}`}
                  key={option.id}
                  onPress={() => {
                    setLink(option);
                    setPickerOpen(false);
                  }}
                  selected={link?.id === option.id}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Typography numberOfLines={1} variant="emphasis-sm">{option.title}</Typography>
                    <Typography numberOfLines={1} variant="meta" style={{ color: colors.text.secondary }}>
                      {suggestedDescription(option)}
                    </Typography>
                  </View>
                </PressableRow>
              ))}
            </View>
          ) : null}

          <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, marginLeft: -SPACE.md }}>
              <QuietAction
                active={pickerOpen || !!link}
                icon="link-outline"
                label="Link"
                accessibilityLabel="Link a Goal, milestone, or reflection"
                onPress={() => setPickerOpen((value) => !value)}
              />
            </View>
            <Button disabled={!canPost} onPress={publish} size="compact">
              Post update
            </Button>
          </View>
        </View>
      </View>
    </Card>
  );
}
