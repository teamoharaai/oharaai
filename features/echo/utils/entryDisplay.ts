import type { EchoEntry } from '../types';

export function getEntryTitle(entry: EchoEntry): string {
  const title = entry.title?.trim();
  if (title) return title;

  const firstLine = entry.content.split('\n').find((line) => line.trim().length > 0)?.trim();
  return firstLine || 'Untitled Entry';
}

export function getEntrySnippet(entry: EchoEntry): string {
  return entry.content.replace(/\s+/g, ' ').trim();
}

export function formatEntryDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getContainerCaption(entry: EchoEntry): string {
  if (entry.folderName === 'General') return 'Entries';
  return entry.folderName || entry.goalTitle || 'Unassigned';
}
