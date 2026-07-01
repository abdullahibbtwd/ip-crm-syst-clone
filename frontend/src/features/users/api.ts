import { apiClient } from '@/lib/api-client'

export type AttorneyAssignee = {
  id: string
  fullName: string
  email: string
  roles: string[]
}

export const usersApi = {
  listAssignees: () => apiClient.get<AttorneyAssignee[]>('/users/assignees'),
}
