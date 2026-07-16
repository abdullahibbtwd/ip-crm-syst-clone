import {
  addDays,
  daysUntil,
  shiftToBusinessDay,
  startOfDay,
  toDateKey,
} from './deadlines.utils';

describe('deadlines.utils', () => {
  describe('toDateKey', () => {
    it('formats local YYYY-MM-DD', () => {
      expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
    });
  });

  describe('startOfDay', () => {
    it('zeros the time components', () => {
      const result = startOfDay(new Date(2026, 5, 15, 14, 30, 45));
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getDate()).toBe(15);
    });
  });

  describe('addDays', () => {
    it('adds calendar days when businessDaysOnly is false', () => {
      // Friday + 1 calendar day = Saturday
      const friday = new Date(2026, 6, 17); // Jul 17 2026 is Friday
      const result = addDays(friday, 1, false);
      expect(toDateKey(result)).toBe('2026-07-18');
    });

    it('skips weekends for business days', () => {
      // Friday + 1 business day = Monday
      const friday = new Date(2026, 6, 17);
      const result = addDays(friday, 1, true);
      expect(toDateKey(result)).toBe('2026-07-20');
    });

    it('skips holidays when provided', () => {
      // Thursday + 1 business day, but Friday is a holiday → Monday
      const thursday = new Date(2026, 6, 16);
      const holidays = new Set(['2026-07-17']);
      const result = addDays(thursday, 1, true, holidays);
      expect(toDateKey(result)).toBe('2026-07-20');
    });
  });

  describe('shiftToBusinessDay', () => {
    it('returns weekday unchanged', () => {
      const wednesday = new Date(2026, 6, 15);
      expect(toDateKey(shiftToBusinessDay(wednesday))).toBe('2026-07-15');
    });

    it('shifts Saturday to Monday', () => {
      const saturday = new Date(2026, 6, 18);
      expect(toDateKey(shiftToBusinessDay(saturday))).toBe('2026-07-20');
    });

    it('shifts holiday to next business day', () => {
      const monday = new Date(2026, 6, 20);
      const holidays = new Set(['2026-07-20']);
      expect(toDateKey(shiftToBusinessDay(monday, holidays))).toBe(
        '2026-07-21',
      );
    });
  });

  describe('daysUntil', () => {
    it('returns positive days for a future due date', () => {
      const from = new Date(2026, 0, 1);
      const due = new Date(2026, 0, 11);
      expect(daysUntil(due, from)).toBe(10);
    });

    it('returns negative days for a past due date', () => {
      const from = new Date(2026, 0, 11);
      const due = new Date(2026, 0, 1);
      expect(daysUntil(due, from)).toBe(-10);
    });

    it('returns 0 for the same calendar day', () => {
      const from = new Date(2026, 0, 5, 9);
      const due = new Date(2026, 0, 5, 18);
      expect(daysUntil(due, from)).toBe(0);
    });
  });
});
