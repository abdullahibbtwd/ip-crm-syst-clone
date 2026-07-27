import { apiClient } from '@/lib/api-client'
import type { AttorneyAssignee } from './utils'
import type {
  InviteUserResult,
  PaginatedUsers,
  UserFilters,
  UserListItem,
} from './types'
import type { SystemRole } from '@/lib/rbac'

export type { AttorneyAssignee } from './utils'

export type InviteUserInput = {
  email: string
  fullName: string
  role: SystemRole
  clientCode?: string
}

export type UpdateUserRoleInput = {
  role: Exclude<SystemRole, 'portal_client'>
}

export const usersApi = {
  list: (filters: UserFilters) =>
    apiClient.get<PaginatedUsers>('/users', filters as Record<string, unknown>),

  listAssignees: () => apiClient.get<AttorneyAssignee[]>('/users/assignees'),

  invite: (data: InviteUserInput) =>
    apiClient.post<InviteUserResult>('/users/invite', data),

  resendInvite: (id: string) =>
    apiClient.post<InviteUserResult>(`/users/${id}/resend-invite`),

  updateRole: (id: string, data: UpdateUserRoleInput) =>
    apiClient.patch<UserListItem>(`/users/${id}/role`, data),
}
