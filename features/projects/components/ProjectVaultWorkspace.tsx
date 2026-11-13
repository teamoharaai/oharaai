import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { VaultWorkspace, type VaultFilter } from '@/features/goals/components/GoalVault';
import { SourceComposer } from '@/features/sources/components/SourceComposer';
import type { ProjectWorkspace } from '../types';
import { useProjectVault } from '../hooks/useProjectVault';

export function ProjectVaultWorkspace({ addRequest, initialFilter, project, onRetry }: { addRequest: number; initialFilter?: VaultFilter; project: ProjectWorkspace; onRetry?: () => void }) {
  const colors = useThemeColors();
  const vault = useProjectVault(project.id, project.vaultItems);
  const [sourceOpen, setSourceOpen] = useState(false);
  const activity = project.activity.filter((item) => item.id.startsWith('vault-')).slice(0, 12);
  return <>
    <VaultWorkspace
      activityContent={!project.secondaryLoaded ? <Typography variant="body">Loading Vault activity…</Typography> : project.partialErrors.includes('Vault content') ? <Typography variant="body">Vault activity could not load.</Typography> : activity.length ? <View>{activity.map((item) => <View key={item.id} style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.xs, paddingVertical: SPACE.md }}><Typography variant="body-small">{item.label}</Typography><Typography variant="caption">{item.origin} · {new Date(item.occurredAt).toLocaleDateString()}</Typography></View>)}</View> : <Typography variant="body">Meaningful Vault activity will appear here.</Typography>}
      activityError={project.partialErrors.includes('Vault content') ? 'Vault activity could not load.' : null}
      activityItems={[]}
      activityLoading={!project.secondaryLoaded}
      entries={project.entries}
      entriesError={project.partialErrors.includes('shared Entries') ? 'Some linked Notes and Reflections could not be loaded. Available content is shown below.' : null}
      entriesLoading={!project.secondaryLoaded}
      onRetryEntries={onRetry}
      onAddSource={() => setSourceOpen(true)}
      externalAddRequest={addRequest}
      initialFilter={initialFilter}
      refreshSourcesOnMount={false}
      parent={{ id: project.id, title: project.title, type: 'project' }}
      vaultData={{ ...vault,
        // Keep the parent projection current too: this panel unmounts between
        // tabs, and must not restore its pre-mutation Sources on return.
        updateItem: async (id, updates) => { await vault.updateItem(id, updates); onRetry?.(); },
        removeItem: async (id) => { await vault.removeItem(id); onRetry?.(); },
        loading: vault.loading || !project.secondaryLoaded, error: vault.error ?? (project.partialErrors.includes('Vault content') ? 'Project Sources could not load.' : null) }}
      showAddButton={Platform.OS === 'web' && project.status !== 'archived' && project.collaboration.capabilities.includes('add_shared_content')}
    />
    <SourceComposer canShare={project.collaboration.role === 'owner'} context={{ kind: 'project', id: project.id }} onClose={() => setSourceOpen(false)} onCreated={() => { if (onRetry) onRetry(); else void vault.refresh(); }} visible={sourceOpen} />
  </>;
}
