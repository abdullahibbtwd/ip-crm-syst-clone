export const correspondenceKeys = {
  all: ['correspondence'] as const,
  matter: (matterId: string) => [...correspondenceKeys.all, 'matter', matterId] as const,
  timeline: (matterId: string) => [...correspondenceKeys.all, 'timeline', matterId] as const,
}
