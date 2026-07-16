import { DeadlineStatus } from '../../generated/prisma/client';
import {
  daysUntilDue,
  deadlineUrgency,
  isCriticalUrgency,
} from './urgency.util';

describe('urgency.util', () => {
  describe('daysUntilDue', () => {
    it('computes calendar day difference', () => {
      const from = new Date(2026, 2, 1);
      const due = new Date(2026, 2, 8);
      expect(daysUntilDue(due, from)).toBe(7);
    });
  });

  describe('deadlineUrgency', () => {
    it('returns completed for completed/superseded', () => {
      const due = new Date();
      due.setDate(due.getDate() + 5);
      expect(deadlineUrgency(due, DeadlineStatus.completed)).toBe('completed');
      expect(deadlineUrgency(due, DeadlineStatus.superseded)).toBe('completed');
    });

    it('returns overdue for missed/escalated', () => {
      const due = new Date();
      due.setDate(due.getDate() + 10);
      expect(deadlineUrgency(due, DeadlineStatus.missed)).toBe('overdue');
      expect(deadlineUrgency(due, DeadlineStatus.escalated)).toBe('overdue');
    });

    it('tiers open deadlines by days until due', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const overdue = new Date(today);
      overdue.setDate(today.getDate() - 2);
      expect(deadlineUrgency(overdue, DeadlineStatus.pending)).toBe('overdue');

      const dueToday = new Date(today);
      expect(deadlineUrgency(dueToday, DeadlineStatus.pending)).toBe('today');

      const urgent = new Date(today);
      urgent.setDate(today.getDate() + 5);
      expect(deadlineUrgency(urgent, DeadlineStatus.in_progress)).toBe(
        'urgent',
      );

      const soon = new Date(today);
      soon.setDate(today.getDate() + 20);
      expect(deadlineUrgency(soon, DeadlineStatus.pending)).toBe('soon');

      const ok = new Date(today);
      ok.setDate(today.getDate() + 45);
      expect(deadlineUrgency(ok, DeadlineStatus.pending)).toBe('ok');
    });
  });

  describe('isCriticalUrgency', () => {
    it('flags overdue, today, and urgent', () => {
      expect(isCriticalUrgency('overdue')).toBe(true);
      expect(isCriticalUrgency('today')).toBe(true);
      expect(isCriticalUrgency('urgent')).toBe(true);
      expect(isCriticalUrgency('soon')).toBe(false);
      expect(isCriticalUrgency('ok')).toBe(false);
      expect(isCriticalUrgency('completed')).toBe(false);
    });
  });
});
