import { PaymentStatus } from '../../generated/prisma/client';

/** Mirrors receivables aging tiers used in report UI. */
export type AgingBucket = 'current' | 'overdue30' | 'overdue60' | 'overdue90plus';

export function daysPastDue(dueDate: Date, from = new Date()): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const now = new Date(from);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export function receivablesAgingBucket(
  dueDate: Date | null,
  from = new Date(),
): AgingBucket {
  if (!dueDate) return 'current';
  const days = daysPastDue(dueDate, from);
  if (days <= 0) return 'current';
  if (days <= 30) return 'overdue30';
  if (days <= 60) return 'overdue60';
  return 'overdue90plus';
}

export function isCriticalAgingBucket(bucket: AgingBucket): boolean {
  return bucket === 'overdue60' || bucket === 'overdue90plus';
}

export const OPEN_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.unpaid,
  PaymentStatus.partial,
];
