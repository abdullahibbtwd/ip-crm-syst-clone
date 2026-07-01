/**
 * Add calendar or business days (Mon–Fri) to a start date.
 */
export function addDays(
  start: Date,
  days: number,
  businessDaysOnly = true,
): Date {
  const result = new Date(start);
  if (!businessDaysOnly) {
    result.setDate(result.getDate() + days);
    return result;
  }

  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return result;
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
