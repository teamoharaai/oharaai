import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { LIGHT_THEME } from '@/constants/colors';
import { resolveBrt } from '@/lib/utils/resolveBrt';
import { EntryActionMenu } from './EntryActionMenu';
import type { EchoEntry } from '../types';

type EchoEntryRowProps = {
  entry: EchoEntry;
  caption: string;
  selected: boolean;
  showSnippet?: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onMoveToFolder: () => void;
  onDelete: () => void;
};

function getEntryTitle(entry: EchoEntry): string {
  const title = entry.title?.trim();
  if (title) return title;

  const firstLine = entry.content.split('\n').find((line) => line.trim().length > 0)?.trim();
  return firstLine || 'Untitled Echo';
}

function getEntrySnippet(entry: EchoEntry): string {
  return entry.content.replace(/\s+/g, ' ').trim();
}

export function EchoEntryRow({
  entry,
  caption,
  selected,
  showSnippet = true,
  onSelect,
  onEdit,
  onMoveToFolder,
  onDelete,
}: EchoEntryRowProps) {
  const brtCategory = resolveBrt(entry.brt);
  const dotColor = brtCategory ? LIGHT_THEME.brt[brtCategory] : LIGHT_THEME.text.muted;

  return (
    <View className="relative mx-3 mb-2 overflow-hidden rounded-xl border border-border-color-subtle bg-white shadow-sm">
      <Pressable
        onPress={onSelect}
        className="min-h-[74px] flex-row gap-2.5 px-3 py-3"
        style={{
          backgroundColor: selected ? LIGHT_THEME.background.selectedRow : LIGHT_THEME.background.card,
        }}
      >
        <View
          className="mt-1.5 h-2 w-2 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <View className="min-w-0 flex-1 pr-7">
          <Typography variant="echo-entry-title" numberOfLines={1}>
            {getEntryTitle(entry)}
          </Typography>
          {showSnippet ? (
            <Typography variant="echo-entry-preview" className="mt-0.5" numberOfLines={1}>
              {getEntrySnippet(entry)}
            </Typography>
          ) : null}
          <Typography
            variant="echo-entry-meta"
            className={showSnippet ? 'mt-1' : 'mt-0.5'}
            numberOfLines={1}
          >
            {caption}
          </Typography>
        </View>
      </Pressable>

      <EntryActionMenu onEdit={onEdit} onMoveToFolder={onMoveToFolder} onDelete={onDelete} />
    </View>
  );
}
