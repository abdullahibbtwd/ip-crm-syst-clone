import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { holdingGroupsApi } from '../api'
import { holdingGroupKeys } from '../queryKeys'
import type { HoldingGroupFilters } from '../types'
import type { CreateHoldingGroupFormValues } from '../schemas'

export function useHoldingGroups(filters?: HoldingGroupFilters) {
  const resolved: HoldingGroupFilters = { limit: 50, ...filters }
  return useQuery({
    queryKey: holdingGroupKeys.list(resolved),
    queryFn: () => holdingGroupsApi.list(resolved),
  })
}

export function useHoldingGroup(id: string) {
  return useQuery({
    queryKey: holdingGroupKeys.detail(id),
    queryFn: () => holdingGroupsApi.get(id),
    enabled: Boolean(id),
  })
}

export function useCreateHoldingGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateHoldingGroupFormValues) => holdingGroupsApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: holdingGroupKeys.lists() })
    },
  })
}
