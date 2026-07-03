import type { IntakeFilters } from './types'

export const intakeKeys = {
  all: ['intake'] as const,
  lists: () => [...intakeKeys.all, 'list'] as const,
  list: (filters: IntakeFilters) => [...intakeKeys.lists(), filters] as const,
  detail: (id: string) => [...intakeKeys.all, 'detail', id] as const,
  pendingCount: () => [...intakeKeys.all, 'pending-count'] as const,
}
