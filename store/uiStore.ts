import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { colorScheme } from 'nativewind';
import { Platform } from 'react-native';
import { DARK_THEME, LIGHT_THEME } from '@/constants/colors';

export type ThemeMode = 'light' | 'dark';
export type DashboardGoalsView = 'grid' | 'list';

interface UIStore {
  rightPaneWidth: number;
  echoMiddleMode: 'list' | 'tree';
  dashboardGoalsView: DashboardGoalsView;
  constellationLegendCollapsed: boolean;
  entriesIntelligenceOpen: boolean;
  entriesLibraryCollapsed: boolean;
  themeMode: ThemeMode;
  setRightPaneWidth: (width: number) => void;
  setEchoMiddleMode: (mode: 'list' | 'tree') => void;
  setDashboardGoalsView: (view: DashboardGoalsView) => void;
  setConstellationLegendCollapsed: (collapsed: boolean) => void;
  toggleConstellationLegendCollapsed: () => void;
  setEntriesIntelligenceOpen: (open: boolean) => void;
  setEntriesLibraryCollapsed: (collapsed: boolean) => void;
  toggleEntriesLibraryCollapsed: () => void;
  toggleTheme: () => void;
}

function applyThemeMode(themeMode: ThemeMode) {
  if (Platform.OS === 'web' && typeof window === 'undefined') return;
  colorScheme.set(themeMode);
}

const webStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(name);
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
  },
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      rightPaneWidth: 420,
      echoMiddleMode: 'list',
      dashboardGoalsView: 'list',
      constellationLegendCollapsed: false,
      entriesIntelligenceOpen: true,
      entriesLibraryCollapsed: false,
      themeMode: 'light',
      setRightPaneWidth: (width) => set({ rightPaneWidth: width }),
      setEchoMiddleMode: (mode) => set({ echoMiddleMode: mode }),
      setDashboardGoalsView: (view) => set({ dashboardGoalsView: view }),
      setConstellationLegendCollapsed: (collapsed) =>
        set({ constellationLegendCollapsed: collapsed }),
      toggleConstellationLegendCollapsed: () =>
        set((state) => ({
          constellationLegendCollapsed: !state.constellationLegendCollapsed,
        })),
      setEntriesIntelligenceOpen: (open) => set({ entriesIntelligenceOpen: open }),
      setEntriesLibraryCollapsed: (collapsed) => set({ entriesLibraryCollapsed: collapsed }),
      toggleEntriesLibraryCollapsed: () => set((state) => ({
        entriesLibraryCollapsed: !state.entriesLibraryCollapsed,
      })),
      toggleTheme: () =>
        set((state) => {
          const themeMode = state.themeMode === 'light' ? 'dark' : 'light';
          applyThemeMode(themeMode);
          return { themeMode };
        }),
    }),
    {
      name: 'ohara-ui-state',
      version: 5,
      migrate: (persistedState, version) => {
        const { sidebarCollapsed: _legacySidebarCollapsed, ...state } = persistedState as Partial<UIStore> & {
          sidebarCollapsed?: boolean;
        };
        return {
          ...state,
          dashboardGoalsView: version < 2
            ? 'list'
            : state.dashboardGoalsView ?? 'list',
          constellationLegendCollapsed: version < 3
            ? false
            : state.constellationLegendCollapsed ?? false,
          entriesLibraryCollapsed: version < 5
            ? false
            : state.entriesLibraryCollapsed ?? false,
        } as UIStore;
      },
      storage: createJSONStorage(() => webStorage),
      partialize: (state) => ({
        rightPaneWidth: state.rightPaneWidth,
        echoMiddleMode: state.echoMiddleMode,
        dashboardGoalsView: state.dashboardGoalsView,
        constellationLegendCollapsed: state.constellationLegendCollapsed,
        entriesLibraryCollapsed: state.entriesLibraryCollapsed,
        themeMode: state.themeMode,
      }),
      onRehydrateStorage: () => (state) => {
        applyThemeMode(state?.themeMode ?? 'light');
      },
    }
  )
);

export function useThemeColors() {
  const themeMode = useUIStore((state) => state.themeMode);
  return themeMode === 'dark' ? DARK_THEME : LIGHT_THEME;
}
