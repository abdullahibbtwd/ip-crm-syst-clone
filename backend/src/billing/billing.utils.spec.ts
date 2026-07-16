import { Prisma } from '../../generated/prisma/client';
import {
  assertBillableHasRate,
  assertQuarterHourIncrement,
  computeTimeEntryAmount,
  decimalToNumber,
  roundMoney,
} from './billing.utils';

describe('billing.utils', () => {
  describe('decimalToNumber', () => {
    it('converts Prisma.Decimal', () => {
      expect(decimalToNumber(new Prisma.Decimal('12.50'))).toBe(12.5);
    });

    it('passes through numbers and numeric strings', () => {
      expect(decimalToNumber(7.25)).toBe(7.25);
      expect(decimalToNumber('3.5')).toBe(3.5);
    });
  });

  describe('roundMoney', () => {
    it('rounds to two decimal places', () => {
      expect(roundMoney(10.125)).toBe(10.13);
      expect(roundMoney(10.124)).toBe(10.12);
      expect(roundMoney(99.999)).toBe(100);
    });
  });

  describe('computeTimeEntryAmount', () => {
    it('multiplies hours by rate when billable', () => {
      expect(computeTimeEntryAmount(1.5, 200, true)).toBe(300);
    });

    it('returns 0 when non-billable', () => {
      expect(computeTimeEntryAmount(2, 250, false)).toBe(0);
    });

    it('rounds money result', () => {
      expect(computeTimeEntryAmount(0.25, 333, true)).toBe(83.25);
    });
  });

  describe('assertQuarterHourIncrement', () => {
    it('accepts quarter-hour increments', () => {
      expect(() => assertQuarterHourIncrement(0.25)).not.toThrow();
      expect(() => assertQuarterHourIncrement(1)).not.toThrow();
      expect(() => assertQuarterHourIncrement(1.75)).not.toThrow();
    });

    it('rejects values below the minimum', () => {
      expect(() => assertQuarterHourIncrement(0)).toThrow(/at least 0\.25/);
      expect(() => assertQuarterHourIncrement(0.1)).toThrow(/at least 0\.25/);
    });

    it('rejects non quarter-hour values', () => {
      expect(() => assertQuarterHourIncrement(0.3)).toThrow(/0\.25-hour increments/);
      expect(() => assertQuarterHourIncrement(1.1)).toThrow(/0\.25-hour increments/);
    });
  });

  describe('assertBillableHasRate', () => {
    it('allows non-billable with zero rate', () => {
      expect(() => assertBillableHasRate(false, 0)).not.toThrow();
    });

    it('allows billable with a positive rate', () => {
      expect(() => assertBillableHasRate(true, 150)).not.toThrow();
    });

    it('rejects billable with zero rate', () => {
      expect(() => assertBillableHasRate(true, 0)).toThrow(/hourly rate/);
    });
  });
});
