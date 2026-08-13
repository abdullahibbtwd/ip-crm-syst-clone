import type { MatterFilters } from './types'

export const matterKeys = {
  all: ['matters'] as const,
  lists: () => [...matterKeys.all, 'list'] as const,
  list: (filters: MatterFilters) => [...matterKeys.lists(), filters] as const,
  shelfCounts: () => [...matterKeys.all, 'shelf-counts'] as const,
  details: () => [...matterKeys.all, 'detail'] as const,
  detail: (id: string) => [...matterKeys.details(), id] as const,
  ipRights: (matterId: string) => [...matterKeys.detail(matterId), 'ip-rights'] as const,
}
