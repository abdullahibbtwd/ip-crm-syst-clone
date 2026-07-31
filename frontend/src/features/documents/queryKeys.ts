export const documentKeys = {
  all: ['documents'] as const,
  templates: () => [...documentKeys.all, 'templates'] as const,
  portal: (filters?: Record<string, unknown>) =>
    [...documentKeys.all, 'portal', filters ?? {}] as const,
  shared: (filters?: Record<string, unknown>) =>
    [...documentKeys.all, 'shared', filters ?? {}] as const,
  matter: (matterId: string, filters?: Record<string, unknown>) =>
    [...documentKeys.all, 'matter', matterId, filters ?? {}] as const,
  client: (clientId: string, filters?: Record<string, unknown>) =>
    [...documentKeys.all, 'client', clientId, filters ?? {}] as const,
  versions: (documentId: string) =>
    [...documentKeys.all, 'versions', documentId] as const,
}
