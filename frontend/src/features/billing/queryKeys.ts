export const billingKeys = {
  all: ['billing'] as const,
  matter: (matterId: string) => [...billingKeys.all, 'matter', matterId] as const,
  timeEntries: (matterId: string) =>
    [...billingKeys.matter(matterId), 'time-entries'] as const,
  fixedFees: (matterId: string) =>
    [...billingKeys.matter(matterId), 'fixed-fees'] as const,
  summary: (matterId: string) => [...billingKeys.matter(matterId), 'summary'] as const,
  resolveRate: (matterId: string, date?: string) =>
    [...billingKeys.matter(matterId), 'resolve-rate', date ?? 'today'] as const,
}
