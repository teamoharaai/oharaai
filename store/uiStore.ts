import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

interface UIStore {
  sidebarCollapsed: boolean;
  rightPaneWidth: number;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setRightPaneWidth: (width: number) => void;
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
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setRightPaneWidth: (width) => set({ rightPaneWidth: width }),
    }),
    {
      name: 'ohara-ui-state',
      storage: createJSONStorage(() => webStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        rightPaneWidth: state.rightPaneWidth,
      }),
    }
  )
);
