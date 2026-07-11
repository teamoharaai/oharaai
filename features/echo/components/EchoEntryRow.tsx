import { Pressable, Text, View } from 'react-native';
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
    <View className="relative">
      <Pressable
        onPress={onSelect}
        className="flex-row gap-2.5 rounded-lg px-3 py-2.5"
        style={{
          backgroundColor: selected ? LIGHT_THEME.background.selectedRow : 'transparent',
          borderBottomColor: LIGHT_THEME.border.divider,
          borderBottomWidth: 1,
        }}
      >
        <View
          className="mt-1.5 h-2 w-2 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <View className="min-w-0 flex-1 pr-7">
          <Text
            numberOfLines={1}
            className="font-sans"
            style={{
              color: LIGHT_THEME.text.primary,
              fontFamily: 'Inter-Bold',
              fontSize: 13.5,
              lineHeight: 18,
            }}
          >
            {getEntryTitle(entry)}
          </Text>
          {showSnippet ? (
            <Text
              numberOfLines={1}
              className="mt-0.5 font-sans"
              style={{
                color: LIGHT_THEME.text.secondary,
                fontSize: 12,
                lineHeight: 16,
              }}
            >
              {getEntrySnippet(entry)}
            </Text>
          ) : null}
          <Text
            numberOfLines={1}
            className={`${showSnippet ? 'mt-1' : 'mt-0.5'} font-sans`}
            style={{
              color: LIGHT_THEME.text.muted,
              fontFamily: 'Inter-Medium',
              fontSize: 10.5,
              lineHeight: 14,
            }}
          >
            {caption}
          </Text>
        </View>
      </Pressable>

      <EntryActionMenu onEdit={onEdit} onMoveToFolder={onMoveToFolder} onDelete={onDelete} />
    </View>
  );
}
