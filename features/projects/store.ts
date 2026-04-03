import { create } from 'zustand';
import type { Project } from '@/features/goals/types';
import {
  fetchProjects,
  createProject as createProjectService,
  updateProject as updateProjectService,
} from './services/project-service';
import supabase from '@/lib/db/client';

interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  loadProjects: () => Promise<void>;
  createProject: (payload: { title: string; description?: string }) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Pick<Project, 'title' | 'description' | 'status'>>) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  loadProjects: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isLoading: false });
        return;
      }
      const projects = await fetchProjects(user.id);
      set({ projects, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load projects', isLoading: false });
    }
  },

  createProject: async (payload) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const project = await createProjectService({ ...payload, user_id: user.id });
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },

  updateProject: async (id, updates) => {
    const project = await updateProjectService(id, updates);
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? project : p)),
    }));
  },
}));
