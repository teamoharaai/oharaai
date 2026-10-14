import { useState } from 'react';
import { View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { VaultWorkspace, type VaultFilter } from '@/features/goals/components/GoalVault';
import { SourceComposer } from '@/features/sources/components/SourceComposer';
import type { ProjectWorkspace } from '../types';
import { useProjectVault } from '../hooks/useProjectVault';

export function ProjectVaultWorkspace({ addRequest, initialFilter, project }: { addRequest: number; initialFilter?: VaultFilter; project: ProjectWorkspace }) {
  const colors = useThemeColors();
  const vault = useProjectVault(project.id, project.vaultItems);
  const [sourceOpen, setSourceOpen] = useState(false);
  return <>
    <VaultWorkspace
      activityContent={<View>{project.activity.filter((item) => item.id.startsWith('vault-')).slice(0, 12).map((item) => <View key={item.id} style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.xs, paddingVertical: SPACE.md }}><Typography variant="body-small">{item.label}</Typography><Typography variant="caption">{item.origin} · {new Date(item.occurredAt).toLocaleDateString()}</Typography></View>)}</View>}
      activityError={null}
      activityItems={[]}
      activityLoading={false}
      entries={project.entries}
      entriesError={project.partialErrors.includes('Echo content') ? 'Linked entries could not be loaded.' : null}
      onAddSource={() => setSourceOpen(true)}
      externalAddRequest={addRequest}
      initialFilter={initialFilter}
      parent={{ id: project.id, title: project.title, type: 'project' }}
      vaultData={vault}
      showAddButton={false}
    />
    <SourceComposer canShare={project.collaboration.role === 'owner'} context={{ kind: 'project', id: project.id }} onClose={() => setSourceOpen(false)} onCreated={() => { void vault.refresh(); }} visible={sourceOpen} />
  </>;
}
