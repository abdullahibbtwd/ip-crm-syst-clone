import type { DeadlineStatus } from '../../generated/prisma/client';

export type ReminderMilestone = {
  key: string;
  offsetDays: number;
  direction: 'before' | 'after';
  label: string;
};

/** Reminder schedule: 30d, 7d, 3d, 1d before due; due today; 3d after due. */
export const DEADLINE_REMINDER_MILESTONES: ReminderMilestone[] = [
  { key: 'before_30', offsetDays: 30, direction: 'before', label: '30 days' },
  { key: 'before_7', offsetDays: 7, direction: 'before', label: '7 days' },
  { key: 'before_3', offsetDays: 3, direction: 'before', label: '3 days' },
  { key: 'before_1', offsetDays: 1, direction: 'before', label: '1 day' },
  { key: 'due_today', offsetDays: 0, direction: 'before', label: 'today' },
  { key: 'after_3', offsetDays: 3, direction: 'after', label: '3 days overdue' },
];

export const MAX_DAYS_BEFORE_REMINDER = Math.max(
  ...DEADLINE_REMINDER_MILESTONES.filter((m) => m.direction === 'before').map(
    (m) => m.offsetDays,
  ),
);

export const MAX_DAYS_AFTER_REMINDER = Math.max(
  ...DEADLINE_REMINDER_MILESTONES.filter((m) => m.direction === 'after').map(
    (m) => m.offsetDays,
  ),
);

const BEFORE_REMINDER_STATUSES: DeadlineStatus[] = ['pending', 'in_progress'];
const AFTER_REMINDER_STATUSES: DeadlineStatus[] = [
  'pending',
  'in_progress',
  'missed',
  'escalated',
];

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysUntilDue(dueDate: Date, from = new Date()): number {
  const due = startOfDay(dueDate);
  const today = startOfDay(from);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function milestoneMatches(
  milestone: ReminderMilestone,
  daysUntil: number,
): boolean {
  return milestone.direction === 'before'
    ? daysUntil === milestone.offsetDays
    : daysUntil === -milestone.offsetDays;
}

export function isEligibleForMilestone(
  status: DeadlineStatus,
  milestone: ReminderMilestone,
): boolean {
  const allowed =
    milestone.direction === 'before'
      ? BEFORE_REMINDER_STATUSES
      : AFTER_REMINDER_STATUSES;
  return allowed.includes(status);
}

export function parseRemindersSent(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

export function reminderTitle(
  milestone: ReminderMilestone,
  deadlineTitle: string,
): string {
  if (milestone.direction === 'after') {
    return `Deadline overdue: ${deadlineTitle}`;
  }
  if (milestone.offsetDays === 0) {
    return `Deadline due today: ${deadlineTitle}`;
  }
  if (milestone.offsetDays === 1) {
    return `Deadline tomorrow: ${deadlineTitle}`;
  }
  return `Deadline in ${milestone.label}: ${deadlineTitle}`;
}

export function reminderBody(
  milestone: ReminderMilestone,
  matterTitle: string,
  dueLabel: string,
): string {
  if (milestone.direction === 'after') {
    return `${matterTitle} was due ${dueLabel} (${milestone.label}).`;
  }
  if (milestone.offsetDays === 0) {
    return `${matterTitle} — due today (${dueLabel}).`;
  }
  if (milestone.offsetDays === 1) {
    return `${matterTitle} — due ${dueLabel} (tomorrow).`;
  }
  return `${matterTitle} — due ${dueLabel} (in ${milestone.label}).`;
}

export function reminderEmailSubject(
  milestone: ReminderMilestone,
  deadlineTitle: string,
  dueLabel: string,
): string {
  if (milestone.direction === 'after') {
    return `Overdue (${milestone.label}): ${deadlineTitle}`;
  }
  if (milestone.offsetDays === 0) {
    return `Due today: ${deadlineTitle} (${dueLabel})`;
  }
  if (milestone.offsetDays === 1) {
    return `Reminder: ${deadlineTitle} due tomorrow (${dueLabel})`;
  }
  return `Reminder: ${deadlineTitle} due in ${milestone.label} (${dueLabel})`;
}
