export const taskKeys = {
  all: ['tasks'] as const,
  matter: (matterId: string) => [...taskKeys.all, 'matter', matterId] as const,
  my: (params?: { limit?: number }) => [...taskKeys.all, 'my', params ?? {}] as const,
}
