import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useThemeColors } from '@/store/uiStore';
import { AppNavigation } from './AppNavigation';

export interface WorkspaceShellProps {
  children: ReactNode;
  onNewEntry: () => void;
  onNewProject: () => void;
}

/** Native keeps its existing navigation and geometry. */
export function WorkspaceShell({ children, onNewEntry, onNewProject }: WorkspaceShellProps) {
  const colors = useThemeColors();
  return <View style={{ flex: 1, minHeight: 0, backgroundColor: colors.background.page }}>
    <AppNavigation onNewEntry={onNewEntry} onNewProject={onNewProject} />
    {children}
  </View>;
}
