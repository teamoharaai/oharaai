import { Pressable, View, type ViewStyle } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { resolveBrt } from '@/lib/utils/resolveBrt';
import { useThemeColors } from '@/store/uiStore';
import { EntryActionMenu } from './EntryActionMenu';
import type { EchoEntry } from '../types';
import { getEntrySnippet, getEntryTitle } from '../utils/entryDisplay';

type EchoEntryRowProps = {
  entry: EchoEntry;
  caption?: string;
  selected: boolean;
  showSnippet?: boolean;
  showCaption?: boolean;
  treeIndent?: number;
  variant?: 'list' | 'tree';
  onSelect: () => void;
  onEdit: () => void;
  onMoveToFolder: () => void;
  onDelete: () => void;
};

export function EchoEntryRow({
  entry,
  caption = '',
  selected,
  showSnippet = true,
  showCaption = true,
  treeIndent = 0,
  variant = 'list',
  onSelect,
  onEdit,
  onMoveToFolder,
  onDelete,
}: EchoEntryRowProps) {
  const colors = useThemeColors();
  const brtCategory = entry.brtCategory ?? resolveBrt(entry.brt);
  const dotColor = brtCategory ? colors.brt[brtCategory] : colors.text.muted;
  const isTreeVariant = variant === 'tree';
  const containerStyle: ViewStyle | undefined = isTreeVariant
    ? { marginLeft: treeIndent, marginRight: 8 }
    : undefined;

  return (
    <View
      className={
        isTreeVariant
          ? 'relative mb-0 overflow-visible rounded-lg'
          : 'relative mx-3 mb-2 overflow-hidden rounded-xl border shadow-sm dark:shadow-none'
      }
      style={[
        containerStyle,
        isTreeVariant
          ? undefined
          : { backgroundColor: colors.background.card, borderColor: colors.border.subtle },
      ]}
    >
      <Pressable
        onPress={onSelect}
        className={
          isTreeVariant
            ? 'min-h-[33px] flex-row gap-2 rounded-lg px-3 py-2'
            : 'min-h-[74px] flex-row gap-2.5 px-3 py-3'
        }
        style={{
          backgroundColor: selected
            ? colors.background.selectedRow
            : isTreeVariant
              ? 'transparent'
              : colors.background.card,
        }}
      >
        <View
          className={isTreeVariant ? 'mt-1.5 h-[5px] w-[5px] rounded-full' : 'mt-1.5 h-2 w-2 rounded-full'}
          style={{ backgroundColor: dotColor }}
        />
        <View className="min-w-0 flex-1 pr-7">
          <Typography
            variant="echo-entry-title"
            numberOfLines={1}
            style={isTreeVariant ? { fontSize: 12.5, lineHeight: 17 } : undefined}
          >
            {getEntryTitle(entry)}
          </Typography>
          {showSnippet ? (
            <Typography variant="echo-entry-preview" className="mt-0.5" numberOfLines={1}>
              {getEntrySnippet(entry)}
            </Typography>
          ) : null}
          {showCaption ? (
            <Typography
              variant="echo-entry-meta"
              className={showSnippet ? 'mt-1' : 'mt-0.5'}
              numberOfLines={1}
            >
              {caption}
            </Typography>
          ) : null}
        </View>
      </Pressable>

      <EntryActionMenu onEdit={onEdit} onMoveToFolder={onMoveToFolder} onDelete={onDelete} />
    </View>
  );
}
