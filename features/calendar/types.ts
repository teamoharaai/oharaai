export type CalendarSourceType = 'task_occurrence' | 'milestone' | 'goal_deadline' | 'external_event';
export type CalendarProviderId = 'ohara' | 'apple' | 'google';
export type CalendarItemStatus = 'pending' | 'completed' | 'skipped' | 'missed' | 'cancelled' | 'active';
export type CalendarRelevanceScope = 'ohara' | 'projects';

/**
 * Provider-neutral item consumed by every OHARA calendar surface. OHARA rows
 * remain canonical: this is a bounded read projection, never a second copy of
 * Task, Milestone, or Goal state.
 */
export interface CalendarItem {
  id: string;
  sourceType: CalendarSourceType;
  sourceId: string;
  title: string;
  contextTitle: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  timezone: string | null;
  provider: CalendarProviderId;
  calendarId: string | null;
  goalId: string | null;
  projectId: string | null;
  projectTitle: string | null;
  taskId: string | null;
  occurrenceId: string | null;
  isOharaItem: boolean;
  isExternal: boolean;
  /**
   * Product relevance is narrower than RLS visibility. `ohara` means the item
   * belongs on the viewer's direct schedule; `projects` also includes Project
   * work the viewer created and delegated to somebody else.
   */
  calendarScopes?: CalendarRelevanceScope[];
  status: CalendarItemStatus;
  visibility: string;
}

export interface CalendarRange {
  startDate: string;
  endDate: string;
  timezone: string;
}

export type CalendarView = 'today' | 'week' | 'month';
export type CalendarFilter = 'all' | 'ohara' | 'personal' | 'projects';
