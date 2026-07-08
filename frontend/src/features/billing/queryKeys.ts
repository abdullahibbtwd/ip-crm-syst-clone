export const billingKeys = {
  all: ['billing'] as const,
  rateCards: () => [...billingKeys.all, 'rate-cards'] as const,
  overview: () => [...billingKeys.all, 'overview'] as const,
  client: (clientId: string) => [...billingKeys.all, 'client', clientId] as const,
  clientSummary: (clientId: string) =>
    [...billingKeys.client(clientId), 'summary'] as const,
  matter: (matterId: string) => [...billingKeys.all, 'matter', matterId] as const,
  timeEntries: (matterId: string) =>
    [...billingKeys.matter(matterId), 'time-entries'] as const,
  fixedFees: (matterId: string) =>
    [...billingKeys.matter(matterId), 'fixed-fees'] as const,
  summary: (matterId: string) => [...billingKeys.matter(matterId), 'summary'] as const,
  resolveRate: (matterId: string, date?: string) =>
    [...billingKeys.matter(matterId), 'resolve-rate', date ?? 'today'] as const,
}
