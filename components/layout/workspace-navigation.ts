import { isActiveRoute } from './navigation-state.ts';

export const WORKSPACE_LINKS = [
  { label: 'Home', href: '/dashboard', matches: ['/dashboard'], icon: 'home-outline', group: 'workspace' },
  { label: 'Goals', href: '/goals', matches: ['/goals'], icon: 'goals', group: 'workspace' },
  { label: 'Projects', href: '/projects', matches: ['/projects'], icon: 'project', group: 'workspace' },
  { label: 'Calendar', href: '/calendar', matches: ['/calendar'], icon: 'calendar', group: 'workspace' },
  { label: 'Notes', href: '/notes', matches: ['/notes', '/entries', '/echo'], icon: 'notes', group: 'vault' },
  { label: 'Reflections', href: '/journal', matches: ['/journal', '/reflections'], icon: 'reflections', group: 'vault' },
  { label: 'Sources', href: '/notes?view=sources', matches: ['/notes'], icon: 'vault', group: 'vault' },
  { label: 'Momentum', href: '/momentum', matches: ['/momentum'], icon: 'momentum', group: 'insight' },
  { label: 'Roots', href: '/constellation', matches: ['/constellation'], icon: 'constellation', group: 'insight' },
  { label: 'Circles', href: '/circles', matches: ['/circles'], icon: 'circles', group: 'insight' },
] as const;

export type WorkspaceLink = (typeof WORKSPACE_LINKS)[number];

export function isWorkspaceLinkActive(item: WorkspaceLink, pathname: string, view?: string | string[]) {
  const sourceView = pathname === '/notes' && (Array.isArray(view) ? view[0] : view) === 'sources';
  if (item.label === 'Sources') return sourceView;
  if (item.label === 'Notes' && sourceView) return false;
  if (item.label === 'Notes' && (pathname === '/entries/reflection' || pathname.startsWith('/entries/reflection/'))) return false;
  if (item.label === 'Reflections' && (pathname === '/entries/reflection' || pathname.startsWith('/entries/reflection/'))) return true;
  return isActiveRoute(pathname, item.matches);
}
