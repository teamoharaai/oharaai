import { create } from 'zustand';

interface UIState {
  globalLoading: boolean;
  modalOpen: boolean;
  modalContent: string | null;
  setGlobalLoading: (loading: boolean) => void;
  openModal: (content: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  globalLoading: false,
  modalOpen: false,
  modalContent: null,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
  openModal: (content) => set({ modalOpen: true, modalContent: content }),
  closeModal: () => set({ modalOpen: false, modalContent: null }),
}));
