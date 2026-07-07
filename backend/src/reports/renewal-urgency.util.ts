import { RenewalStatus } from '../../generated/prisma/client';

/** Mirrors `frontend/src/features/renewals/utils.ts` renewalUrgency tiers. */
export type RenewalUrgencyTier =
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

export function renewalUrgency(
  dueDate: Date,
  status: RenewalStatus,
): RenewalUrgencyTier {
  if (status === RenewalStatus.completed || status === RenewalStatus.lapsed) {
    return 'completed';
  }
  const days = daysUntilDue(dueDate);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'soon';
  return 'ok';
}

export function isCriticalRenewalUrgency(tier: RenewalUrgencyTier): boolean {
  return tier === 'overdue' || tier === 'today' || tier === 'urgent';
}

export const ACTIVE_RENEWAL_PIPELINE_STATUSES: RenewalStatus[] = [
  RenewalStatus.upcoming,
  RenewalStatus.instructed,
  RenewalStatus.filed,
];
