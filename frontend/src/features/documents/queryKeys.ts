export const documentKeys = {
  all: ['documents'] as const,
  portal: (filters?: Record<string, unknown>) =>
    [...documentKeys.all, 'portal', filters ?? {}] as const,
  matter: (matterId: string, filters?: Record<string, unknown>) =>
    [...documentKeys.all, 'matter', matterId, filters ?? {}] as const,
  versions: (documentId: string) =>
    [...documentKeys.all, 'versions', documentId] as const,
}
