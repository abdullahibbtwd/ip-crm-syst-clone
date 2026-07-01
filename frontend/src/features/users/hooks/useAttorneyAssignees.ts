import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../api'

export const userKeys = {
  assignees: ['users', 'assignees'] as const,
}

export function useAttorneyAssignees() {
  return useQuery({
    queryKey: userKeys.assignees,
    queryFn: () => usersApi.listAssignees(),
  })
}
