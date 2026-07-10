import { useQuery } from '@tanstack/react-query'
import { searchApi } from '../api'

export const searchKeys = {
  all: ['search'] as const,
  query: (q: string) => [...searchKeys.all, q] as const,
}

export function useGlobalSearch(q: string, enabled: boolean) {
  const trimmed = q.trim()
  return useQuery({
    queryKey: searchKeys.query(trimmed),
    queryFn: () => searchApi.query(trimmed),
    enabled: enabled && trimmed.length >= 2,
    staleTime: 15_000,
  })
}
