import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../api'
import { userKeys } from '../queryKeys'
import type { UserFilters } from '../types'

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => usersApi.list(filters),
  })
}
