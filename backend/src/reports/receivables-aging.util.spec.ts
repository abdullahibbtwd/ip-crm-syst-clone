import { PaymentStatus } from '../../generated/prisma/client';
import {
  OPEN_PAYMENT_STATUSES,
  daysPastDue,
  isCriticalAgingBucket,
  receivablesAgingBucket,
} from './receivables-aging.util';

describe('receivables-aging.util', () => {
  const from = new Date(2026, 5, 15); // Jun 15 2026

  describe('daysPastDue', () => {
    it('returns positive when past due', () => {
      expect(daysPastDue(new Date(2026, 5, 1), from)).toBe(14);
    });

    it('returns zero or negative when not yet due', () => {
      expect(daysPastDue(new Date(2026, 5, 15), from)).toBe(0);
      expect(daysPastDue(new Date(2026, 5, 20), from)).toBe(-5);
    });
  });

  describe('receivablesAgingBucket', () => {
    it('returns current when dueDate is null', () => {
      expect(receivablesAgingBucket(null, from)).toBe('current');
    });

    it('buckets by days past due', () => {
      expect(receivablesAgingBucket(new Date(2026, 5, 20), from)).toBe(
        'current',
      );
      expect(receivablesAgingBucket(new Date(2026, 5, 1), from)).toBe(
        'overdue30',
      );
      expect(receivablesAgingBucket(new Date(2026, 3, 20), from)).toBe(
        'overdue60',
      );
      expect(receivablesAgingBucket(new Date(2026, 1, 1), from)).toBe(
        'overdue90plus',
      );
    });
  });

  describe('isCriticalAgingBucket', () => {
    it('flags 60+ day buckets', () => {
      expect(isCriticalAgingBucket('current')).toBe(false);
      expect(isCriticalAgingBucket('overdue30')).toBe(false);
      expect(isCriticalAgingBucket('overdue60')).toBe(true);
      expect(isCriticalAgingBucket('overdue90plus')).toBe(true);
    });
  });

  describe('OPEN_PAYMENT_STATUSES', () => {
    it('includes unpaid and partial', () => {
      expect(OPEN_PAYMENT_STATUSES).toEqual([
        PaymentStatus.unpaid,
        PaymentStatus.partial,
      ]);
    });
  });
});
