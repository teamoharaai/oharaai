import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { PRODUCT_CATEGORIES } from '@/lib/goals/product-categories';
import { GoalVisibilityControl } from './GoalVisibilityControl';
import { goalAudience, saveGoalVisibility, type GoalVisibilityChoice } from '../services/goal-visibility-service';
import { fetchGoalById, updateGoal } from '../services/goal-service';
import { useGoalStore } from '../store';
import type { GoalWithDetails } from '../types';

export function ManageGoalControl({ goal, superseded, onComplete, onArchive }: {
  goal: GoalWithDetails; superseded: boolean;
  onComplete: () => Promise<boolean>; onArchive: () => Promise<boolean>;
}) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [audienceLoaded, setAudienceLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<GoalVisibilityChoice>('private');
  const [audience, setAudience] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(goal.title);
  const [category, setCategory] = useState(goal.category);
  const upsert = useGoalStore((state) => state.upsertGoal);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(null);
    try {
      await action();
      const saved = await fetchGoalById(goal.id);
      if (saved) {
        // The core Goal query deliberately does not hydrate Vault notes/folders.
        // Preserve the currently loaded private workspace across metadata edits.
        const current = useGoalStore.getState().goals.find((item) => item.id === goal.id);
        upsert({ ...saved, notes: current?.notes ?? saved.notes, noteFolders: current?.noteFolders ?? saved.noteFolders });
      }
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update Goal.'); }
    finally { setBusy(false); }
  }
  async function show() {
    setAudienceLoaded(false);
    setOpen(true); setEditing(false); setTitle(goal.title); setCategory(goal.category);
    await run(async () => {
      const ids = await goalAudience(goal.id);
      setAudience(ids);
      setVisibility(goal.visibility === 'public' ? 'public' : ids.length ? 'circle' : 'private');
      setAudienceLoaded(true);
    });
  }
  return <>
    <Button size="compact" onPress={() => void show()}>Manage Goal ▾</Button>
    <Modal visible={open} onClose={() => !busy && setOpen(false)} contentStyle={{ maxWidth: 600, maxHeight: '90%' }}>
      <ScrollView contentContainerStyle={{ gap: 18 }}>
        <Typography variant="heading">Manage Goal</Typography>
        <Typography variant="eyebrow">Status · {goal.status === 'stagnant' ? 'Paused' : goal.status}</Typography>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(goal.status === 'active' || goal.status === 'stagnant') && !superseded ?
            <Button disabled={busy} onPress={() => void run(async () => {
              if (!await updateGoal(goal.id, { status: goal.status === 'active' ? 'stagnant' : 'active' })) throw new Error('Status update failed.');
            })}>{goal.status === 'active' ? 'Pause' : 'Resume'}</Button> : null}
          <Button disabled={busy || superseded || goal.status === 'archived' || goal.status === 'complete'} onPress={() => void run(async () => {
            if (!await onComplete()) throw new Error('Completion failed.');
          })}>Complete</Button>
          <Button disabled={busy || superseded || goal.status === 'archived'} onPress={() => void run(async () => {
            if (!await onArchive()) throw new Error('Archive failed.');
          })}>Archive</Button>
        </View>
        {goal.status === 'expired' ? <Typography variant="body">This Goal has expired. Use Extend or New Phase in the workspace to continue.</Typography> : null}
        <GoalVisibilityControl value={visibility} audience={audience} onChange={setVisibility} onAudienceChange={setAudience} />
        <Button disabled={busy || !audienceLoaded || (visibility === 'circle' && !audience.length)} onPress={() => void run(() => saveGoalVisibility(goal.id, visibility, audience))}>Save visibility</Button>
        {!busy && !audienceLoaded ? <Button onPress={() => void show()}>Retry visibility</Button> : null}
        <Button disabled={busy || superseded || goal.status === 'archived'} onPress={() => setEditing(!editing)}>Edit Goal</Button>
        {editing ? <View style={{ gap: 12 }}>
          <TextInput accessibilityLabel="Goal title" value={title} onChangeText={setTitle} maxLength={200}
            style={{ color: colors.text.primary, padding: 12, borderColor: colors.border.divider, borderWidth: 1, borderRadius: 10 }} />
          {PRODUCT_CATEGORIES.map((item) => <Button key={item} variant={category === item ? 'primary' : 'secondary'} onPress={() => setCategory(item)}>{item}</Button>)}
          <Typography variant="caption">Changing category does not change your Momentum scoring profile.</Typography>
          <Button disabled={busy || !title.trim()} onPress={() => void run(async () => {
            if (!await updateGoal(goal.id, { title: title.trim(), category })) throw new Error('Goal update failed.');
            setEditing(false);
          })}>Save Goal</Button>
        </View> : null}
        {error ? <Typography variant="body" accessibilityRole="alert">{error}</Typography> : null}
      </ScrollView>
    </Modal>
  </>;
}
