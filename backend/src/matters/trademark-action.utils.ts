export type ReminderUnit = 'months' | 'days';

/** Subtract a calendar offset from an ISO date (`YYYY-MM-DD`) in UTC. */
export function subtractReminderOffset(
  isoDate: string,
  unit: ReminderUnit,
  amount: number,
): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  if (unit === 'months') {
    date.setUTCMonth(date.getUTCMonth() - amount);
  } else {
    date.setUTCDate(date.getUTCDate() - amount);
  }
  return date.toISOString().slice(0, 10);
}

export function isIsoDateBefore(a: string, b: string): boolean {
  return a < b;
}

export type GoodsServicesRow = {
  classNumber: number;
  description: string;
};

export function normalizeGoodsAndServices(
  rows: GoodsServicesRow[],
): GoodsServicesRow[] {
  return rows
    .map((row) => ({
      classNumber: Number(row.classNumber),
      description: (row.description ?? '').trim(),
    }))
    .filter(
      (row) =>
        Number.isInteger(row.classNumber) &&
        row.classNumber >= 1 &&
        row.classNumber <= 45,
    );
}

export function niceClassesFromGoods(rows: GoodsServicesRow[]): string[] {
  return [...new Set(rows.map((row) => String(row.classNumber)))];
}

export function goodsSummary(rows: GoodsServicesRow[]): string {
  return rows
    .map((row) => {
      const text = row.description || '(no description)';
      return `Class ${row.classNumber}: ${text}`;
    })
    .join('\n');
}

export function countSecondaryTrademarkActions(attributes: unknown): number {
  if (!attributes || typeof attributes !== 'object') return 0;
  const raw = (attributes as Record<string, unknown>).trademarkActions;
  if (!Array.isArray(raw)) return 0;
  return raw.filter((row) => {
    if (!row || typeof row !== 'object') return false;
    const kind = String((row as Record<string, unknown>).kind ?? '');
    return kind !== 'scope_correction' && kind.length > 0;
  }).length;
}
