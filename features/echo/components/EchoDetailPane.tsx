import { ScrollView, Text, View } from 'react-native';
import { LIGHT_THEME } from '@/constants/colors';
import { resolveBrt } from '@/lib/utils/resolveBrt';
import { EchoComposer } from './EchoComposer';
import type { CreateEntryResult } from '../services/echo-service';
import type { EchoBrt, EchoEmotion, EchoEntry, EchoGoalOption } from '../types';

type EchoDetailPaneProps = {
  mode: 'empty' | 'view' | 'add';
  entry: EchoEntry | null;
  goals: EchoGoalOption[];
  initialGoalId?: string | null;
  saveEntry: (
    content: string,
    goalId: string | null,
    aiInsightRequested: boolean,
    brt: EchoBrt | null,
    emotion: EchoEmotion | null,
    title: string | null,
  ) => Promise<CreateEntryResult>;
  onCancelAdd: () => void;
  onSaved: (entry: EchoEntry | undefined) => void;
};

function formatEntryDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getEntryTitle(entry: EchoEntry): string {
  const title = entry.title?.trim();
  if (title) return title;

  const firstLine = entry.content.split('\n').find((line) => line.trim().length > 0)?.trim();
  return firstLine || 'Untitled Echo';
}

function getContainerName(entry: EchoEntry): string {
  return entry.folderName || entry.goalTitle || 'Unassigned';
}

function BrtDot({ entry }: { entry: EchoEntry }) {
  const category = resolveBrt(entry.brt);
  const dotColor = category ? LIGHT_THEME.brt[category] : LIGHT_THEME.text.muted;
  return <View className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />;
}

export function EchoDetailPane({
  mode,
  entry,
  goals,
  initialGoalId,
  saveEntry,
  onCancelAdd,
  onSaved,
}: EchoDetailPaneProps) {
  if (mode === 'add') {
    return (
      <EchoComposer
        goals={goals}
        initialGoalId={initialGoalId}
        saveEntry={saveEntry}
        onCancel={onCancelAdd}
        onSaved={onSaved}
      />
    );
  }

  if (mode === 'view' && entry) {
    return (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 36, paddingBottom: 48, paddingTop: 40 }}
      >
        <View className="flex-row items-center gap-2">
          <BrtDot entry={entry} />
          <Text
            className="font-sans"
            style={{
              color: LIGHT_THEME.text.secondary,
              fontFamily: 'Inter-SemiBold',
              fontSize: 12,
              lineHeight: 16,
            }}
          >
            {getContainerName(entry)} · {formatEntryDate(entry.createdAt)}
          </Text>
        </View>

        <Text
          className="mt-4 font-sans"
          style={{
            color: LIGHT_THEME.text.primary,
            fontFamily: 'Inter-ExtraBold',
            fontSize: 26,
            lineHeight: 34,
            maxWidth: 640,
          }}
        >
          {getEntryTitle(entry)}
        </Text>

        <Text
          className="mt-5 font-sans"
          style={{
            color: LIGHT_THEME.text.primary,
            fontSize: 15,
            lineHeight: 27,
            maxWidth: 640,
          }}
        >
          {entry.content}
        </Text>
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text
        className="font-sans"
        style={{
          color: LIGHT_THEME.text.primary,
          fontFamily: 'Inter-Bold',
          fontSize: 16,
          lineHeight: 22,
        }}
      >
        Select an entry
      </Text>
      <Text
        className="mt-2 text-center font-sans"
        style={{ color: LIGHT_THEME.text.secondary, fontSize: 13.5, lineHeight: 20 }}
      >
        Choose an Echo from the list, or add a new reflection.
      </Text>
    </View>
  );
}
