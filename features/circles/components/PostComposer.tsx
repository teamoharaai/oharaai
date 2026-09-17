import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE, TYPE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { ME } from '../fixtures';
import type { LinkableItem, MyGoal, MyReflection } from '../types';
import {
  ImagePlaceholder,
  PersonAvatar,
  PressableRow,
  QuietAction,
} from './primitives';

type LinkKind = LinkableItem['kind'];

const LINK_KIND_OPTIONS: { value: LinkKind; label: string }[] = [
  { value: 'goal', label: 'Goal' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'reflection', label: 'Reflection' },
];

function linkDescription(link: LinkableItem): string {
  return link.kind === 'milestone' ? `Part of ${link.goalTitle}` : link.description;
}

export function PostComposer({
  compact,
  myGoals,
  myReflections,
  onPublish,
}: {
  compact: boolean;
  myGoals: MyGoal[];
  myReflections: MyReflection[];
  onPublish: (input: { body: string; withImage: boolean; link: LinkableItem | null }) => void;
}) {
  const colors = useThemeColors();
  const [body, setBody] = useState('');
  const [focused, setFocused] = useState(false);
  const [withImage, setWithImage] = useState(false);
  const [link, setLink] = useState<LinkableItem | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState<LinkKind>('goal');
  const canPost = body.trim().length > 0;

  const options = useMemo<LinkableItem[]>(() => {
    if (pickerKind === 'goal') {
      return myGoals.map((goal) => ({
        kind: 'goal', id: goal.id, title: goal.title, category: goal.category, description: goal.description,
      }));
    }
    if (pickerKind === 'milestone') {
      return myGoals.flatMap((goal) => goal.milestones
        .filter((milestone) => milestone.done)
        .map((milestone) => ({
          kind: 'milestone' as const,
          id: `${goal.id}:${milestone.title}`,
          title: milestone.title,
          category: goal.category,
          goalTitle: goal.title,
        })));
    }
    return myReflections.map((reflection) => ({
      kind: 'reflection', id: reflection.id, title: reflection.title, description: reflection.description,
    }));
  }, [myGoals, myReflections, pickerKind]);

  function publish() {
    if (!canPost) return;
    onPublish({ body: body.trim(), withImage, link });
    setBody('');
    setWithImage(false);
    setLink(null);
    setPickerOpen(false);
  }

  return (
    <Card elevated padding="spacious">
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.lg }}>
        {compact ? null : <PersonAvatar person={ME} size={44} />}
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

          {withImage ? (
            <View>
              <ImagePlaceholder
                caption="Image placeholder"
                height={150}
                tone={link && link.kind !== 'reflection' ? link.category : 'growth'}
              />
              <Pressable
                accessibilityLabel="Remove image"
                accessibilityRole="button"
                onPress={() => setWithImage(false)}
                style={{
                  alignItems: 'center',
                  backgroundColor: colors.background.card,
                  borderRadius: 16,
                  height: 32,
                  justifyContent: 'center',
                  position: 'absolute',
                  right: SPACE.md,
                  top: SPACE.md,
                  width: 32,
                }}
              >
                <Ionicons color={colors.text.secondary} name="close" size={16} />
              </Pressable>
            </View>
          ) : null}

          {link ? (
            <View
              style={{
                alignItems: 'center',
                backgroundColor: colors.background.subtle,
                borderColor: colors.border.warmSubtle,
                borderRadius: RADIUS.md,
                borderWidth: 1,
                flexDirection: 'row',
                gap: SPACE.lg,
                padding: SPACE.md,
                paddingLeft: SPACE.lg,
              }}
            >
              <Ionicons color={colors.text.accent} name="link-outline" size={18} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Typography numberOfLines={1} variant="emphasis-sm">{link.title}</Typography>
                <Typography numberOfLines={1} variant="meta" style={{ color: colors.text.muted }}>
                  {linkDescription(link)}
                </Typography>
              </View>
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
              <Typography variant="meta" style={{ color: colors.text.muted }}>
                Only the title and a short description are shared.
              </Typography>
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
                      {linkDescription(option)}
                    </Typography>
                  </View>
                </PressableRow>
              ))}
            </View>
          ) : null}

          <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, marginLeft: -SPACE.md }}>
              <QuietAction
                active={withImage}
                icon="image-outline"
                label={compact ? 'Image' : 'Attach image'}
                onPress={() => setWithImage((value) => !value)}
              />
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
