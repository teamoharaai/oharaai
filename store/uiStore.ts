import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { colorScheme } from 'nativewind';
import { Platform } from 'react-native';
import { DARK_THEME, LIGHT_THEME } from '@/constants/colors';

export type ThemeMode = 'light' | 'dark';
export type DashboardGoalsView = 'grid' | 'list';
export type EntriesTab = 'notes' | 'reflections';

interface UIStore {
  sidebarCollapsed: boolean;
  rightPaneWidth: number;
  echoMiddleMode: 'list' | 'tree';
  dashboardGoalsView: DashboardGoalsView;
  constellationLegendCollapsed: boolean;
  entriesTab: EntriesTab;
  entriesIntelligenceOpen: boolean;
  themeMode: ThemeMode;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setRightPaneWidth: (width: number) => void;
  setEchoMiddleMode: (mode: 'list' | 'tree') => void;
  setDashboardGoalsView: (view: DashboardGoalsView) => void;
  setConstellationLegendCollapsed: (collapsed: boolean) => void;
  toggleConstellationLegendCollapsed: () => void;
  setEntriesTab: (tab: EntriesTab) => void;
  setEntriesIntelligenceOpen: (open: boolean) => void;
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
      sidebarCollapsed: false,
      rightPaneWidth: 420,
      echoMiddleMode: 'list',
      dashboardGoalsView: 'list',
      constellationLegendCollapsed: false,
      entriesTab: 'notes',
      entriesIntelligenceOpen: false,
      themeMode: 'light',
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setRightPaneWidth: (width) => set({ rightPaneWidth: width }),
      setEchoMiddleMode: (mode) => set({ echoMiddleMode: mode }),
      setDashboardGoalsView: (view) => set({ dashboardGoalsView: view }),
      setConstellationLegendCollapsed: (collapsed) =>
        set({ constellationLegendCollapsed: collapsed }),
      toggleConstellationLegendCollapsed: () =>
        set((state) => ({
          constellationLegendCollapsed: !state.constellationLegendCollapsed,
        })),
      setEntriesTab: (tab) => set({ entriesTab: tab }),
      setEntriesIntelligenceOpen: (open) => set({ entriesIntelligenceOpen: open }),
      toggleTheme: () =>
        set((state) => {
          const themeMode = state.themeMode === 'light' ? 'dark' : 'light';
          applyThemeMode(themeMode);
          return { themeMode };
        }),
    }),
    {
      name: 'ohara-ui-state',
      version: 3,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<UIStore>;
        return {
          ...state,
          dashboardGoalsView: version < 2
            ? 'list'
            : state.dashboardGoalsView ?? 'list',
          constellationLegendCollapsed: version < 3
            ? false
            : state.constellationLegendCollapsed ?? false,
        } as UIStore;
      },
      storage: createJSONStorage(() => webStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        rightPaneWidth: state.rightPaneWidth,
        echoMiddleMode: state.echoMiddleMode,
        dashboardGoalsView: state.dashboardGoalsView,
        constellationLegendCollapsed: state.constellationLegendCollapsed,
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
