import { RenewalStatus } from '../../generated/prisma/client';
import {
  ACTIVE_RENEWAL_PIPELINE_STATUSES,
  isCriticalRenewalUrgency,
  renewalUrgency,
} from './renewal-urgency.util';

describe('renewal-urgency.util', () => {
  describe('renewalUrgency', () => {
    it('returns completed for completed/lapsed', () => {
      const due = new Date();
      due.setDate(due.getDate() + 5);
      expect(renewalUrgency(due, RenewalStatus.completed)).toBe('completed');
      expect(renewalUrgency(due, RenewalStatus.lapsed)).toBe('completed');
    });

    it('tiers active renewals by days until due', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const overdue = new Date(today);
      overdue.setDate(today.getDate() - 1);
      expect(renewalUrgency(overdue, RenewalStatus.upcoming)).toBe('overdue');

      const dueToday = new Date(today);
      expect(renewalUrgency(dueToday, RenewalStatus.instructed)).toBe('today');

      const urgent = new Date(today);
      urgent.setDate(today.getDate() + 3);
      expect(renewalUrgency(urgent, RenewalStatus.filed)).toBe('urgent');

      const soon = new Date(today);
      soon.setDate(today.getDate() + 15);
      expect(renewalUrgency(soon, RenewalStatus.upcoming)).toBe('soon');

      const ok = new Date(today);
      ok.setDate(today.getDate() + 60);
      expect(renewalUrgency(ok, RenewalStatus.upcoming)).toBe('ok');
    });
  });

  describe('isCriticalRenewalUrgency', () => {
    it('flags overdue, today, and urgent', () => {
      expect(isCriticalRenewalUrgency('overdue')).toBe(true);
      expect(isCriticalRenewalUrgency('today')).toBe(true);
      expect(isCriticalRenewalUrgency('urgent')).toBe(true);
      expect(isCriticalRenewalUrgency('soon')).toBe(false);
    });
  });

  describe('ACTIVE_RENEWAL_PIPELINE_STATUSES', () => {
    it('includes upcoming, instructed, and filed', () => {
      expect(ACTIVE_RENEWAL_PIPELINE_STATUSES).toEqual([
        RenewalStatus.upcoming,
        RenewalStatus.instructed,
        RenewalStatus.filed,
      ]);
    });
  });
});
