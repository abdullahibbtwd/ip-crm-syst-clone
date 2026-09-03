import type { ClientFilters, HoldingGroupFilters } from './types'

export const holdingGroupKeys = {
  all: ['holding-groups'] as const,
  lists: () => [...holdingGroupKeys.all, 'list'] as const,
  list: (filters?: HoldingGroupFilters) => [...holdingGroupKeys.lists(), filters ?? {}] as const,
  details: () => [...holdingGroupKeys.all, 'detail'] as const,
  detail: (id: string) => [...holdingGroupKeys.details(), id] as const,
}

export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (filters: ClientFilters) => [...clientKeys.lists(), filters] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientKeys.details(), id] as const,
  summary: (id: string) => [...clientKeys.detail(id), 'summary'] as const,
  addressInsights: (id: string) => [...clientKeys.detail(id), 'address-insights'] as const,
  offices: (id: string) => [...clientKeys.detail(id), 'offices'] as const,
  contacts: (id: string, role?: string) =>
    [...clientKeys.detail(id), 'contacts', role ?? 'all'] as const,
  related: (id: string) => [...clientKeys.detail(id), 'related'] as const,
  history: (id: string) => [...clientKeys.detail(id), 'history'] as const,
  notes: (id: string) => [...clientKeys.detail(id), 'notes'] as const,
  tabCounts: (id: string) => [...clientKeys.detail(id), 'tab-counts'] as const,
  deadlines: (id: string) => [...clientKeys.detail(id), 'deadlines'] as const,
}

export const globalContactKeys = {
  all: ['contacts'] as const,
  lists: () => [...globalContactKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...globalContactKeys.lists(), filters] as const,
}
