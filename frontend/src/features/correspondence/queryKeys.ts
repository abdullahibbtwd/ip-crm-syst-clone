export const correspondenceKeys = {
  all: ['correspondence'] as const,
  matter: (matterId: string) => [...correspondenceKeys.all, 'matter', matterId] as const,
  client: (clientId: string) => [...correspondenceKeys.all, 'client', clientId] as const,
  timeline: (matterId: string) => [...correspondenceKeys.all, 'timeline', matterId] as const,
  portal: () => [...correspondenceKeys.all, 'portal'] as const,
  portalDetail: (id: string) => [...correspondenceKeys.portal(), id] as const,
}
