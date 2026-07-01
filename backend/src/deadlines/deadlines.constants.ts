export const DEADLINES_MODULE = 'deadlines';

export const ACTIVE_DEADLINE_STATUSES = ['pending', 'in_progress'] as const;

/** Hidden from worklists and matter deadline tabs - retained for audit. */
export const HIDDEN_DEADLINE_STATUSES = ['superseded'] as const;

export const UPCOMING_DEADLINE_WINDOW_DAYS = 30;
