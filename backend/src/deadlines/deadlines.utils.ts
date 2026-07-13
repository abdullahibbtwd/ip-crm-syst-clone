/**
 * Format a date as YYYY-MM-DD in local calendar components (UTC-safe for Date-only).
 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type HolidaySet = ReadonlySet<string>;

/**
 * Add calendar or business days (Mon–Fri, optionally excluding holidays) to a start date.
 */
export function addDays(
  start: Date,
  days: number,
  businessDaysOnly = true,
  holidays?: HolidaySet,
): Date {
  const result = new Date(start);
  if (!businessDaysOnly) {
    result.setDate(result.getDate() + days);
    return result;
  }

  const holidayKeys = holidays ?? new Set<string>();
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day === 0 || day === 6) continue;
    if (holidayKeys.has(toDateKey(result))) continue;
    added += 1;
  }
  return result;
}

/**
 * If `date` falls on a weekend or holiday, shift forward to the next business day.
 */
export function shiftToBusinessDay(date: Date, holidays?: HolidaySet): Date {
  const result = new Date(date);
  const holidayKeys = holidays ?? new Set<string>();
  while (true) {
    const day = result.getDay();
    if (day !== 0 && day !== 6 && !holidayKeys.has(toDateKey(result))) {
      return result;
    }
    result.setDate(result.getDate() + 1);
  }
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysUntil(dueDate: Date, from = new Date()): number {
  const ms = startOfDay(dueDate).getTime() - startOfDay(from).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
