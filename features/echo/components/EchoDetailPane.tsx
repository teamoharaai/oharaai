import { ScrollView, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { resolveBrt } from '@/lib/utils/resolveBrt';
import { useThemeColors } from '@/store/uiStore';
import { getContainerCaption } from '../utils/entryDisplay';
import { EchoComposer } from './EchoComposer';
import { EchoEntryEditForm } from './EchoEntryEditForm';
import type { CreateEntryResult } from '../services/echo-service';
import type { BrtCategory, EchoBrt, EchoEmotion, EchoEntry, EchoGoalOption } from '../types';

type EchoDetailPaneProps = {
  mode: 'empty' | 'view' | 'add' | 'edit';
  entry: EchoEntry | null;
  goals: EchoGoalOption[];
  initialGoalId?: string | null;
  saveEntry: (
    content: string,
    goalId: string | null,
    aiInsightRequested: boolean,
    brt: EchoBrt | null,
    emotion: EchoEmotion | null,
    title: string,
  ) => Promise<CreateEntryResult>;
  onCancelAdd: () => void;
  onSaved: (entry: EchoEntry | undefined) => void;
  editIsSaving: boolean;
  editError: string | null;
  onSaveEdit: (changes: {
    content: string;
    title: string | null;
    brtCategory: BrtCategory | null;
  }) => void;
  onCancelEdit: () => void;
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
  return firstLine || 'Untitled Entry';
}

function BrtDot({ entry }: { entry: EchoEntry }) {
  const colors = useThemeColors();
  const category = entry.brtCategory ?? resolveBrt(entry.brt);
  const dotColor = category ? colors.brt[category] : colors.text.muted;
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
  editIsSaving,
  editError,
  onSaveEdit,
  onCancelEdit,
}: EchoDetailPaneProps) {
  const colors = useThemeColors();
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

  if (mode === 'edit' && entry) {
    return (
      <EchoEntryEditForm
        entry={entry}
        isSaving={editIsSaving}
        error={editError}
        onSave={onSaveEdit}
        onCancel={onCancelEdit}
      />
    );
  }

  if (mode === 'view' && entry) {
    return (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 36, paddingBottom: 48, paddingTop: 40 }}
        style={{ minHeight: 0 }}
      >
        <View className="flex-row items-center gap-2">
          <BrtDot entry={entry} />
          <Typography variant="echo-detail-meta">
            {getContainerCaption(entry)} · {formatEntryDate(entry.createdAt)}
          </Typography>
        </View>

        <Typography variant="echo-detail-title" className="mt-4" style={{ maxWidth: 640 }}>
          {getEntryTitle(entry)}
        </Typography>

        <Typography variant="echo-detail-body" className="mt-5" style={{ maxWidth: 640 }}>
          {entry.content}
        </Typography>
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="max-w-[360px] items-center rounded-xl border px-8 py-10 shadow-sm dark:shadow-none"
        style={{ backgroundColor: colors.background.card, borderColor: colors.border.subtle }}
      >
        <Typography variant="echo-empty-title">Select an entry</Typography>
        <Typography variant="echo-empty-subtitle" className="mt-2 text-center">
          Choose an entry from the list, or add a new one.
        </Typography>
      </View>
    </View>
  );
}
