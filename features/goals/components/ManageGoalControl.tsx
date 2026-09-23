import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { PRODUCT_CATEGORIES } from '@/lib/goals/product-categories';
import { GoalVisibilityControl } from './GoalVisibilityControl';
import { goalAudience, saveGoalVisibility, type GoalVisibilityChoice } from '../services/goal-visibility-service';
import { fetchGoalById, updateGoal } from '../services/goal-service';
import { useGoalStore } from '../store';
import type { GoalWithDetails } from '../types';

type ManageTab = 'details' | 'access';

function formatDate(date: Date | null): string {
  if (!date) return 'Not set';
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function FieldLabel({ children }: { children: string }) {
  return <Typography variant="eyebrow">{children}</Typography>;
}

export function ManageGoalControl({ goal, superseded, onComplete, onArchive, onOpenProjectPicker, onEditDeadline, onUpdateDescription }: {
  goal: GoalWithDetails;
  superseded: boolean;
  onComplete: () => Promise<boolean>;
  onArchive: () => Promise<boolean>;
  onOpenProjectPicker: () => void;
  onEditDeadline: () => void;
  onUpdateDescription: (description: string | null) => Promise<boolean>;
}) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ManageTab>('details');
  const [busy, setBusy] = useState(false);
  const [audienceLoaded, setAudienceLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<GoalVisibilityChoice>('private');
  const [audience, setAudience] = useState<string[]>([]);
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? '');
  const [category, setCategory] = useState(goal.category);
  const upsert = useGoalStore((state) => state.upsertGoal);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      const saved = await fetchGoalById(goal.id);
      if (saved) {
        const current = useGoalStore.getState().goals.find((item) => item.id === goal.id);
        upsert({ ...saved, notes: current?.notes ?? saved.notes, noteFolders: current?.noteFolders ?? saved.noteFolders });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update Goal.');
    } finally {
      setBusy(false);
    }
  }

  async function loadAudience() {
    setAudienceLoaded(false);
    await run(async () => {
      const ids = await goalAudience(goal.id);
      setAudience(ids);
      setVisibility(goal.visibility === 'public' ? 'public' : ids.length ? 'circle' : 'private');
      setAudienceLoaded(true);
    });
  }

  async function show() {
    setOpen(true);
    setTab('details');
    setTitle(goal.title);
    setDescription(goal.description ?? '');
    setCategory(goal.category);
    await loadAudience();
  }

  async function saveDetails() {
    await run(async () => {
      const normalizedDescription = description.trim() || null;
      if (title.trim() !== goal.title || category !== goal.category) {
        if (!await updateGoal(goal.id, { title: title.trim(), category })) throw new Error('Goal details update failed.');
      }
      if (normalizedDescription !== (goal.description?.trim() || null)) {
        if (!await onUpdateDescription(normalizedDescription)) throw new Error('Description update failed.');
      }
    });
  }

  const tabButton = (value: ManageTab, label: string) => (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)}
      style={{ borderBottomColor: tab === value ? colors.accent.primary : 'transparent', borderBottomWidth: 2, justifyContent: 'center', minHeight: 42, paddingHorizontal: SPACE.lg }}>
      <Typography variant="emphasis-sm" style={{ color: tab === value ? colors.text.accent : colors.text.secondary }}>{label}</Typography>
    </Pressable>
  );

  return <>
    <Button size="compact" onPress={() => void show()}>Manage Goal ▾</Button>
    <Modal visible={open} onClose={() => !busy && setOpen(false)} contentStyle={{ maxHeight: '90%', maxWidth: 620, padding: 0 }}>
      <View style={{ paddingHorizontal: SPACE['3xl'], paddingTop: SPACE['3xl'] }}>
        <Typography variant="heading">Manage Goal</Typography>
        <View accessibilityRole="tablist" style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: 'row', marginTop: SPACE.xl }}>
          {tabButton('details', 'Details')}
          {tabButton('access', 'Status & Access')}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ gap: SPACE['2xl'], padding: SPACE['3xl'] }}>
        {tab === 'details' ? <>
          <View style={{ gap: SPACE.md }}>
            <FieldLabel>Title & description</FieldLabel>
            <TextInput accessibilityLabel="Goal title" value={title} onChangeText={setTitle} maxLength={200}
              style={{ borderColor: colors.border.input, borderRadius: RADIUS.sm, borderWidth: 1, color: colors.text.primary, padding: 12 }} />
            <TextInput accessibilityLabel="Goal description" value={description} onChangeText={setDescription} multiline
              placeholder="Add a description" placeholderTextColor={colors.text.muted}
              style={{ borderColor: colors.border.input, borderRadius: RADIUS.sm, borderWidth: 1, color: colors.text.primary, minHeight: 92, padding: 12, textAlignVertical: 'top' }} />
          </View>
          <View style={{ gap: SPACE.md }}>
            <FieldLabel>Project</FieldLabel>
            <Typography variant="body">{goal.projectId ? 'Linked to a Project' : 'No Project'}</Typography>
            <Button disabled={busy || superseded || goal.status === 'archived'} variant="secondary" onPress={() => { setOpen(false); onOpenProjectPicker(); }}>
              {goal.projectId ? 'Move or remove from Project' : 'Move to Project'}
            </Button>
          </View>
          <View style={{ gap: SPACE.md }}>
            <FieldLabel>Category</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
              {PRODUCT_CATEGORIES.map((item) => <Button key={item} size="compact" variant={category === item ? 'primary' : 'secondary'} onPress={() => setCategory(item)}>{item}</Button>)}
            </View>
            <Typography variant="caption">Changing category does not change your Momentum scoring profile.</Typography>
          </View>
          <View style={{ gap: SPACE.md }}>
            <FieldLabel>Dates</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE['3xl'] }}>
              <View><Typography variant="caption">Started</Typography><Typography variant="body">{formatDate(goal.createdAt)}</Typography></View>
              <View><Typography variant="caption">End date</Typography><Typography variant="body">{formatDate(goal.deadline)}</Typography></View>
            </View>
            <Button disabled={busy || superseded || goal.status === 'archived'} variant="secondary" onPress={() => { setOpen(false); onEditDeadline(); }}>Edit end date</Button>
          </View>
          <Button disabled={busy || superseded || goal.status === 'archived' || !title.trim()} loading={busy} onPress={() => void saveDetails()}>Save details</Button>
        </> : <>
          <View style={{ gap: SPACE.md }}>
            <FieldLabel>Status</FieldLabel>
            <Typography variant="body">Current status: {goal.status === 'stagnant' ? 'Paused' : goal.status}</Typography>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
              {(goal.status === 'active' || goal.status === 'stagnant') && !superseded ? <Button disabled={busy} onPress={() => void run(async () => {
                if (!await updateGoal(goal.id, { status: goal.status === 'active' ? 'stagnant' : 'active' })) throw new Error('Status update failed.');
              })}>{goal.status === 'active' ? 'Pause' : 'Resume'}</Button> : null}
              <Button disabled={busy || superseded || goal.status === 'archived' || goal.status === 'complete'} onPress={() => void run(async () => {
                if (!await onComplete()) throw new Error('Completion failed.');
              })}>Complete</Button>
            </View>
            {goal.status === 'expired' ? <Typography variant="body">This Goal has expired. Use Extend or New Phase in the workspace to continue.</Typography> : null}
          </View>
          <View style={{ gap: SPACE.md }}>
            <FieldLabel>Visibility</FieldLabel>
            <GoalVisibilityControl value={visibility} audience={audience} onChange={setVisibility} onAudienceChange={setAudience} />
            <Button disabled={busy || !audienceLoaded || (visibility === 'circle' && !audience.length)} onPress={() => void run(() => saveGoalVisibility(goal.id, visibility, audience))}>Save visibility</Button>
            {!busy && !audienceLoaded ? <Button onPress={() => void loadAudience()}>Retry visibility</Button> : null}
          </View>
          <View style={{ borderTopColor: colors.border.divider, borderTopWidth: 1, gap: SPACE.md, paddingTop: SPACE.xl }}>
            <FieldLabel>Archive</FieldLabel>
            <Typography variant="caption">Archive preserves this Goal and its history while removing it from active work.</Typography>
            <Button disabled={busy || superseded || goal.status === 'archived'} variant="danger" onPress={() => void run(async () => {
              if (!await onArchive()) throw new Error('Archive failed.');
            })}>Archive Goal</Button>
          </View>
        </>}
        {error ? <Typography variant="body" accessibilityRole="alert" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}
      </ScrollView>
    </Modal>
  </>;
}
