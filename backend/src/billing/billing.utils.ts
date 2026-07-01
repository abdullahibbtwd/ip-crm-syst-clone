import { Prisma } from '../../generated/prisma/client';
import {
  MIN_TIME_ENTRY_HOURS,
  TIME_ENTRY_HOUR_STEP,
} from './billing.constants';

export function decimalToNumber(value: Prisma.Decimal | number | string): number {
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeTimeEntryAmount(
  hours: number,
  rateSnapshot: number,
  isBillable: boolean,
): number {
  if (!isBillable) return 0;
  return roundMoney(hours * rateSnapshot);
}

export function assertQuarterHourIncrement(hours: number) {
  if (hours < MIN_TIME_ENTRY_HOURS) {
    throw new Error(`Hours must be at least ${MIN_TIME_ENTRY_HOURS}`);
  }
  const steps = hours / TIME_ENTRY_HOUR_STEP;
  if (Math.abs(steps - Math.round(steps)) > 1e-9) {
    throw new Error(`Hours must be in ${TIME_ENTRY_HOUR_STEP}-hour increments`);
  }
}

export function assertBillableHasRate(isBillable: boolean, rateSnapshot: number) {
  if (isBillable && rateSnapshot === 0) {
    throw new Error(
      'Billable time requires an hourly rate. Enter a rate or mark as non-billable.',
    );
  }
}
