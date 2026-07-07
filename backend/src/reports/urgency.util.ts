import { DeadlineStatus } from '../../generated/prisma/client';

/** Mirrors `frontend/src/features/deadlines/utils.ts` - keep tiers aligned with worklists and notifications. */
export type UrgencyTier =
  | 'overdue'
  | 'today'
  | 'urgent'
  | 'soon'
  | 'ok'
  | 'completed';

export function daysUntilDue(dueDate: Date, from = new Date()): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const now = new Date(from);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function deadlineUrgency(
  dueDate: Date,
  status: DeadlineStatus,
): UrgencyTier {
  if (
    status === DeadlineStatus.completed ||
    status === DeadlineStatus.superseded
  ) {
    return 'completed';
  }
  if (status === DeadlineStatus.missed || status === DeadlineStatus.escalated) {
    return 'overdue';
  }
  const days = daysUntilDue(dueDate);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'soon';
  return 'ok';
}

export function isCriticalUrgency(tier: UrgencyTier): boolean {
  return tier === 'overdue' || tier === 'today' || tier === 'urgent';
}
