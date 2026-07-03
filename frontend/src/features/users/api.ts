import { apiClient } from '@/lib/api-client'
import type { AttorneyAssignee } from './utils'
import type { PaginatedUsers, UserFilters } from './types'

export type { AttorneyAssignee } from './utils'

export const usersApi = {
  list: (filters: UserFilters) =>
    apiClient.get<PaginatedUsers>('/users', filters as Record<string, unknown>),

  listAssignees: () => apiClient.get<AttorneyAssignee[]>('/users/assignees'),
}
