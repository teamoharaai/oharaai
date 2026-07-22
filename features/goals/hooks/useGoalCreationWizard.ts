import { useCallback, useMemo, useState } from 'react';

import type { TrackerInput } from '@/features/goals/types';
import type {
  GoalCreationCategory,
  GoalTrackerType,
} from '@/lib/goals/schema';
import {
  getGoalCreationTemplate,
  type GoalCreationDeadlinePreset,
  type GoalCreationTemplateMilestone,
  type GoalCreationTemplateTracker,
} from '@/lib/goals/templates';

export const GOAL_CREATION_REASON_MAX_LENGTH = 280;
export const GOAL_CREATION_MAX_ACTIVE_TRACKERS = 5;

export type GoalCreationWizardStep = 1 | 2 | 3 | 4;
export type GoalCreationSuggestionState = 'visible' | 'applied' | 'dismissed';
export type GoalCreationTrackerSource = 'core' | 'optional' | 'custom';

export interface GoalCreationWizardMilestone {
  id: string;
  title: string;
  week: string;
  why: string;
  suggested: boolean;
}

export interface GoalCreationWizardTracker {
  id: string;
  title: string;
  type: GoalTrackerType;
  targetValue: number | null;
  targetUnit: string | null;
  frequency: 'weekly';
  source: GoalCreationTrackerSource;
  enabled: boolean;
  baseline?: string;
  baselinePrompt?: boolean;
}

export interface GoalCreationMilestoneSubmissionInput {
  title: string;
  description: string | null;
  dueDate: string | null;
}

export interface GoalCreationWizardState {
  step: GoalCreationWizardStep;
  outcome: string;
  category: GoalCreationCategory;
  suggestionState: GoalCreationSuggestionState;
  reason: string;
  preset: GoalCreationDeadlinePreset;
  customDate: string;
  daysPerWeek: number;
  projectId: string | null;
  milestones: GoalCreationWizardMilestone[];
  trackers: GoalCreationWizardTracker[];
  isPrivate: boolean;
  skipTracking: boolean;
  trackingDirty: boolean;
}

export interface UseGoalCreationWizardOptions {
  initialCategory?: GoalCreationCategory;
  initialProjectId?: string | null;
}

export interface NewGoalCreationMilestone {
  title: string;
  week?: string;
  why?: string;
}

export interface NewGoalCreationTracker {
  title: string;
  type?: GoalTrackerType;
  targetValue?: number | null;
  targetUnit?: string | null;
}

let localId = 0;

function createLocalId(prefix: string): string {
  localId += 1;
  return `${prefix}-${Date.now()}-${localId}`;
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function formatIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function createTemplateMilestones(
  category: GoalCreationCategory,
): GoalCreationWizardMilestone[] {
  return getGoalCreationTemplate(category).milestones.map((milestone) => ({ ...milestone }));
}

function templateTrackerToWizardTracker(
  tracker: GoalCreationTemplateTracker,
  source: Exclude<GoalCreationTrackerSource, 'custom'>,
): GoalCreationWizardTracker {
  return {
    id: tracker.id,
    title: tracker.title,
    type: tracker.type,
    targetValue: tracker.targetValue,
    targetUnit: tracker.targetUnit,
    frequency: 'weekly',
    source,
    enabled: source === 'core',
    baseline: tracker.baseline,
    baselinePrompt: tracker.baselinePrompt,
  };
}

export function createTemplateTrackers(
  category: GoalCreationCategory,
): GoalCreationWizardTracker[] {
  const template = getGoalCreationTemplate(category);
  return [
    ...template.coreTrackers.map((tracker) => templateTrackerToWizardTracker(tracker, 'core')),
    ...template.optionalTrackers.map((tracker) => (
      templateTrackerToWizardTracker(tracker, 'optional')
    )),
  ];
}

export function createInitialGoalCreationWizardState(
  options: UseGoalCreationWizardOptions = {},
): GoalCreationWizardState {
  const category = options.initialCategory ?? 'health';
  const template = getGoalCreationTemplate(category);

  return {
    step: 1,
    outcome: '',
    category,
    suggestionState: 'visible',
    reason: '',
    preset: template.deadlineDefault,
    customDate: '',
    daysPerWeek: template.daysDefault,
    projectId: options.initialProjectId ?? null,
    milestones: createTemplateMilestones(category),
    trackers: createTemplateTrackers(category),
    isPrivate: true,
    skipTracking: false,
    trackingDirty: false,
  };
}

/** Resolves the selected deadline as a local-calendar ISO date. */
export function getWizardDeadline(
  preset: GoalCreationDeadlinePreset,
  customDate: string,
  today: Date = new Date(),
): string | null {
  if (preset === 'custom') {
    const parsed = parseIsoDate(customDate);
    return parsed ? formatIsoDate(parsed) : null;
  }

  const deadline = startOfLocalDay(today);
  deadline.setDate(deadline.getDate() + Number(preset));
  return formatIsoDate(deadline);
}

/**
 * Converts a human timing label into an ISO date. Week labels are relative to
 * today and never extend beyond the goal deadline.
 */
export function resolveMilestoneDueDate(
  timing: string,
  goalDeadline: string,
  today: Date = new Date(),
): string | null {
  const deadline = parseIsoDate(goalDeadline);
  if (!deadline) return null;

  const normalizedTiming = timing.trim();
  if (/^target date$/i.test(normalizedTiming)) return formatIsoDate(deadline);

  const weekMatch = normalizedTiming.match(/^week\s+(\d+)$/i);
  if (weekMatch) {
    const dueDate = startOfLocalDay(today);
    dueDate.setDate(dueDate.getDate() + Number(weekMatch[1]) * 7);
    return formatIsoDate(dueDate > deadline ? deadline : dueDate);
  }

  const explicitDate = parseIsoDate(normalizedTiming);
  if (explicitDate) {
    return formatIsoDate(explicitDate > deadline ? deadline : explicitDate);
  }

  return null;
}

export function templateMilestoneToInput(
  milestone: Pick<GoalCreationWizardMilestone, 'title' | 'week' | 'why'>
    | Pick<GoalCreationTemplateMilestone, 'title' | 'week' | 'why'>,
  goalDeadline: string,
  today: Date = new Date(),
): GoalCreationMilestoneSubmissionInput {
  return {
    title: milestone.title.trim(),
    description: milestone.why.trim() || null,
    dueDate: resolveMilestoneDueDate(milestone.week, goalDeadline, today),
  };
}

export function toMilestoneInputs(
  milestones: readonly GoalCreationWizardMilestone[],
  goalDeadline: string,
  today: Date = new Date(),
): GoalCreationMilestoneSubmissionInput[] {
  return milestones
    .filter((milestone) => milestone.title.trim().length > 0)
    .map((milestone) => templateMilestoneToInput(milestone, goalDeadline, today));
}

export function toTrackerInputs(
  trackers: readonly GoalCreationWizardTracker[],
): TrackerInput[] {
  return trackers
    .filter((tracker) => tracker.enabled && tracker.title.trim().length > 0)
    .map((tracker) => ({
      title: tracker.title.trim(),
      type: tracker.type,
      targetValue: tracker.type === 'checklist' ? null : tracker.targetValue,
      targetUnit: tracker.type === 'checklist'
        ? null
        : tracker.targetUnit?.trim() || null,
      frequency: 'weekly',
    }));
}

export function useGoalCreationWizard(options: UseGoalCreationWizardOptions = {}) {
  const [state, setState] = useState<GoalCreationWizardState>(() => (
    createInitialGoalCreationWizardState(options)
  ));

  const template = getGoalCreationTemplate(state.category);
  const deadline = getWizardDeadline(state.preset, state.customDate);
  const activeTrackers = useMemo(
    () => state.trackers.filter((tracker) => tracker.enabled),
    [state.trackers],
  );
  const coreTrackers = useMemo(
    () => state.trackers.filter((tracker) => tracker.source === 'core'),
    [state.trackers],
  );
  const optionalTrackers = useMemo(
    () => state.trackers.filter((tracker) => tracker.source === 'optional'),
    [state.trackers],
  );
  const customTrackers = useMemo(
    () => state.trackers.filter((tracker) => tracker.source === 'custom'),
    [state.trackers],
  );

  const setCategory = useCallback((category: GoalCreationCategory) => {
    setState((current) => {
      if (category === current.category) return current;
      if (current.trackingDirty) return { ...current, category };

      const nextTemplate = getGoalCreationTemplate(category);
      return {
        ...current,
        category,
        suggestionState: 'visible',
        preset: nextTemplate.deadlineDefault,
        customDate: '',
        daysPerWeek: nextTemplate.daysDefault,
        milestones: createTemplateMilestones(category),
        trackers: createTemplateTrackers(category),
        skipTracking: false,
      };
    });
  }, []);

  const setOutcome = useCallback((outcome: string) => {
    setState((current) => ({ ...current, outcome }));
  }, []);

  const applySuggestion = useCallback(() => {
    setState((current) => ({
      ...current,
      outcome: getGoalCreationTemplate(current.category).suggestion,
      suggestionState: 'applied',
    }));
  }, []);

  const dismissSuggestion = useCallback(() => {
    setState((current) => ({ ...current, suggestionState: 'dismissed' }));
  }, []);

  const setReason = useCallback((reason: string) => {
    setState((current) => ({
      ...current,
      reason: reason.slice(0, GOAL_CREATION_REASON_MAX_LENGTH),
    }));
  }, []);

  const setPreset = useCallback((preset: GoalCreationDeadlinePreset) => {
    setState((current) => ({ ...current, preset }));
  }, []);

  const setCustomDate = useCallback((customDate: string) => {
    setState((current) => ({ ...current, preset: 'custom', customDate }));
  }, []);

  const setDaysPerWeek = useCallback((daysPerWeek: number) => {
    const boundedDays = Math.max(1, Math.min(7, Math.round(daysPerWeek)));
    setState((current) => ({ ...current, daysPerWeek: boundedDays }));
  }, []);

  const setProjectId = useCallback((projectId: string | null) => {
    setState((current) => ({ ...current, projectId }));
  }, []);

  const setPrivate = useCallback((isPrivate: boolean) => {
    setState((current) => ({ ...current, isPrivate }));
  }, []);

  const togglePrivate = useCallback(() => {
    setState((current) => ({ ...current, isPrivate: !current.isPrivate }));
  }, []);

  const goToStep = useCallback((step: GoalCreationWizardStep) => {
    setState((current) => ({ ...current, step }));
  }, []);

  const next = useCallback(() => {
    setState((current) => {
      if (current.step === 1 && !current.outcome.trim()) return current;
      return {
        ...current,
        step: Math.min(4, current.step + 1) as GoalCreationWizardStep,
      };
    });
  }, []);

  const back = useCallback(() => {
    setState((current) => ({
      ...current,
      step: Math.max(1, current.step - 1) as GoalCreationWizardStep,
    }));
  }, []);

  const skipToConfirm = useCallback(() => {
    setState((current) => ({
      ...current,
      step: 4,
      milestones: [],
      trackers: [],
      skipTracking: true,
      trackingDirty: true,
    }));
  }, []);

  const resetTrackingToTemplate = useCallback(() => {
    setState((current) => ({
      ...current,
      milestones: createTemplateMilestones(current.category),
      trackers: createTemplateTrackers(current.category),
      skipTracking: false,
      trackingDirty: false,
    }));
  }, []);

  const addMilestone = useCallback((input: NewGoalCreationMilestone): boolean => {
    const title = input.title.trim();
    if (!title) return false;

    setState((current) => ({
      ...current,
      milestones: [
        ...current.milestones,
        {
          id: createLocalId('milestone'),
          title,
          week: input.week?.trim() || 'Anytime',
          why: input.why?.trim() || '',
          suggested: false,
        },
      ],
      skipTracking: false,
      trackingDirty: true,
    }));
    return true;
  }, []);

  const updateMilestone = useCallback((
    id: string,
    updates: Partial<Pick<GoalCreationWizardMilestone, 'title' | 'week' | 'why'>>,
  ) => {
    setState((current) => ({
      ...current,
      milestones: current.milestones.map((milestone) => (
        milestone.id === id ? { ...milestone, ...updates } : milestone
      )),
      skipTracking: false,
      trackingDirty: true,
    }));
  }, []);

  const removeMilestone = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      milestones: current.milestones.filter((milestone) => milestone.id !== id),
      trackingDirty: true,
    }));
  }, []);

  const insertMilestone = useCallback((
    milestone: GoalCreationWizardMilestone,
    index: number,
  ) => {
    setState((current) => {
      const milestones = [...current.milestones];
      milestones.splice(Math.max(0, Math.min(index, milestones.length)), 0, milestone);
      return {
        ...current,
        milestones,
        skipTracking: false,
        trackingDirty: true,
      };
    });
  }, []);

  const moveMilestone = useCallback((id: string, direction: -1 | 1) => {
    setState((current) => {
      const index = current.milestones.findIndex((milestone) => milestone.id === id);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.milestones.length) {
        return current;
      }

      const milestones = [...current.milestones];
      [milestones[index], milestones[targetIndex]] = [milestones[targetIndex], milestones[index]];
      return { ...current, milestones, trackingDirty: true };
    });
  }, []);

  const addTracker = useCallback((input: NewGoalCreationTracker): boolean => {
    const title = input.title.trim();
    if (!title || activeTrackers.length >= GOAL_CREATION_MAX_ACTIVE_TRACKERS) return false;

    const type = input.type ?? 'habit';
    setState((current) => {
      if (
        current.trackers.filter((tracker) => tracker.enabled).length
        >= GOAL_CREATION_MAX_ACTIVE_TRACKERS
      ) {
        return current;
      }
      return {
        ...current,
        trackers: [
          ...current.trackers,
          {
            id: createLocalId('tracker'),
            title,
            type,
            targetValue: type === 'checklist' ? null : input.targetValue ?? 1,
            targetUnit: type === 'checklist' ? null : input.targetUnit?.trim() || null,
            frequency: 'weekly',
            source: 'custom',
            enabled: true,
          },
        ],
        skipTracking: false,
        trackingDirty: true,
      };
    });
    return true;
  }, [activeTrackers.length]);

  const updateTracker = useCallback((
    id: string,
    updates: Partial<Pick<
      GoalCreationWizardTracker,
      'title' | 'type' | 'targetValue' | 'targetUnit' | 'baseline'
    >>,
  ) => {
    setState((current) => ({
      ...current,
      trackers: current.trackers.map((tracker) => {
        if (tracker.id !== id) return tracker;
        const next = { ...tracker, ...updates };
        return next.type === 'checklist'
          ? { ...next, targetValue: null, targetUnit: null }
          : next;
      }),
      skipTracking: false,
      trackingDirty: true,
    }));
  }, []);

  const removeTracker = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      trackers: current.trackers.filter((tracker) => tracker.id !== id),
      trackingDirty: true,
    }));
  }, []);

  const insertTracker = useCallback((tracker: GoalCreationWizardTracker, index: number) => {
    setState((current) => {
      if (
        tracker.enabled
        && current.trackers.filter((item) => item.enabled).length
          >= GOAL_CREATION_MAX_ACTIVE_TRACKERS
      ) {
        return current;
      }

      const trackers = [...current.trackers];
      trackers.splice(Math.max(0, Math.min(index, trackers.length)), 0, tracker);
      return {
        ...current,
        trackers,
        skipTracking: false,
        trackingDirty: true,
      };
    });
  }, []);

  const toggleTracker = useCallback((id: string): boolean => {
    const tracker = state.trackers.find((item) => item.id === id);
    if (!tracker) return false;
    if (!tracker.enabled && activeTrackers.length >= GOAL_CREATION_MAX_ACTIVE_TRACKERS) {
      return false;
    }

    setState((current) => {
      const currentTracker = current.trackers.find((item) => item.id === id);
      if (!currentTracker) return current;
      if (
        !currentTracker.enabled
        && current.trackers.filter((item) => item.enabled).length
          >= GOAL_CREATION_MAX_ACTIVE_TRACKERS
      ) {
        return current;
      }
      return {
        ...current,
        trackers: current.trackers.map((item) => (
          item.id === id ? { ...item, enabled: !item.enabled } : item
        )),
        skipTracking: false,
        trackingDirty: true,
      };
    });
    return true;
  }, [activeTrackers.length, state.trackers]);

  const reset = useCallback((resetOptions: UseGoalCreationWizardOptions = options) => {
    setState(createInitialGoalCreationWizardState(resetOptions));
  }, [options]);

  const milestoneInputs = useMemo(
    () => deadline ? toMilestoneInputs(state.milestones, deadline) : [],
    [deadline, state.milestones],
  );
  const trackerInputs = useMemo(() => toTrackerInputs(state.trackers), [state.trackers]);

  return {
    ...state,
    state,
    template,
    deadline,
    activeTrackers,
    coreTrackers,
    optionalTrackers,
    customTrackers,
    milestoneInputs,
    trackerInputs,
    canAddTracker: activeTrackers.length < GOAL_CREATION_MAX_ACTIVE_TRACKERS,
    setCategory,
    setOutcome,
    applySuggestion,
    dismissSuggestion,
    setReason,
    setPreset,
    setCustomDate,
    setDaysPerWeek,
    setProjectId,
    setPrivate,
    togglePrivate,
    goToStep,
    next,
    back,
    skipToConfirm,
    resetTrackingToTemplate,
    addMilestone,
    updateMilestone,
    removeMilestone,
    insertMilestone,
    moveMilestone,
    addTracker,
    updateTracker,
    removeTracker,
    insertTracker,
    toggleTracker,
    reset,
  };
}
