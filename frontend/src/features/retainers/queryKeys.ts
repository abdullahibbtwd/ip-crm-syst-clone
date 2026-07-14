export const retainerKeys = {
  all: ['retainers'] as const,
  client: (clientId: string) => [...retainerKeys.all, 'client', clientId] as const,
  portal: () => [...retainerKeys.all, 'portal'] as const,
}
