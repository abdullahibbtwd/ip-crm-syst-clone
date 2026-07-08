import { useQuery } from '@tanstack/react-query'
import { ipRightsApi } from '../api'
import type { IpRightsFilters } from '../types'

export function useIpRights(filters: IpRightsFilters) {
  return useQuery({
    queryKey: ['ip-rights', filters],
    queryFn: () => ipRightsApi.list(filters),
    staleTime: 30_000,
  })
}

