export const deadlineKeys = {
  all: ['deadlines'] as const,
  matter: (matterId: string) => [...deadlineKeys.all, 'matter', matterId] as const,
  my: (filters?: Record<string, unknown>) =>
    [...deadlineKeys.all, 'my', filters ?? {}] as const,
  firm: (filters?: Record<string, unknown>) =>
    [...deadlineKeys.all, 'firm', filters ?? {}] as const,
}
