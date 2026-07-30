import { create } from 'zustand';
import type { Project } from '@/features/projects/types';
import {
  fetchProjects,
  createProject as createProjectService,
  updateProject as updateProjectService,
} from './services/project-service';
import supabase from '@/lib/db/client';
import { startPerformanceTimer, type LoadPhase } from '@/lib/diagnostics/performance';

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
    const phase: LoadPhase = get().projects.length === 0 ? 'initial-load' : 'refresh';
    const timing = startPerformanceTimer('projects.load', { phase });
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isLoading: false });
        timing.end({ success: true, resultCount: 0, requestCount: 1 });
        return;
      }
      const projects = await fetchProjects(user.id);
      set({ projects, isLoading: false });
      timing.end({ success: true, resultCount: projects.length, requestCount: 2 });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load projects', isLoading: false });
      timing.end({ success: false, requestCount: 2 });
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
