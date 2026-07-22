/**
 * Route contract for returning to a saved draft. Consumers can navigate to
 * this URL after a successful draft save; Dashboard opens its draft list.
 */
export const DASHBOARD_DRAFTS_ROUTE = '/dashboard?goalFilter=drafts';
export const DASHBOARD_DRAFT_SAVED_ROUTE = '/dashboard?goalFilter=drafts&draftSaved=1';

export const DASHBOARD_GOAL_FILTER_PARAM = 'goalFilter';
export const DASHBOARD_DRAFT_SAVED_PARAM = 'draftSaved';
