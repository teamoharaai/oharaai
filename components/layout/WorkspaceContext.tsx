import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';
import type { ThemeColors } from '@/constants/colors';

export const WorkspaceThemeContext = createContext<ThemeColors | null>(null);
export const WorkspaceDimensionsContext = createContext<{ width: number; height: number } | null>(null);
export const useWorkspaceTheme = () => useContext(WorkspaceThemeContext);

/** Page breakpoints use the usable content area; native falls back to the viewport. */
export function useWorkspaceDimensions() {
  const viewport = useWindowDimensions();
  const workspace = useContext(WorkspaceDimensionsContext);
  return workspace ? { ...viewport, ...workspace } : viewport;
}
