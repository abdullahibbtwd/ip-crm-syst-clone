import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientsApi, holdingGroupsApi } from '../api'
import { clientKeys, holdingGroupKeys } from '../queryKeys'
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

export function useLinkClientsToHoldingGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      clientIds,
      holdingGroupId,
    }: {
      clientIds: string[]
      holdingGroupId: string
      holdingGroupIdForInvalidate?: string
    }) => {
      await Promise.all(
        clientIds.map((clientId) => clientsApi.update(clientId, { holdingGroupId })),
      )
    },
    onSuccess: (_, { clientIds, holdingGroupIdForInvalidate }) => {
      void queryClient.invalidateQueries({ queryKey: holdingGroupKeys.all })
      void queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
      for (const clientId of clientIds) {
        void queryClient.invalidateQueries({ queryKey: clientKeys.detail(clientId) })
      }
      if (holdingGroupIdForInvalidate) {
        void queryClient.invalidateQueries({
          queryKey: holdingGroupKeys.detail(holdingGroupIdForInvalidate),
        })
      }
    },
  })
}

export function useSetClientHoldingGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      clientId,
      holdingGroupId,
    }: {
      clientId: string
      holdingGroupId: string | null
      holdingGroupIdForInvalidate?: string
    }) => clientsApi.update(clientId, { holdingGroupId }),
    onSuccess: (_, { clientId, holdingGroupIdForInvalidate }) => {
      void queryClient.invalidateQueries({ queryKey: holdingGroupKeys.all })
      void queryClient.invalidateQueries({ queryKey: clientKeys.detail(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
      if (holdingGroupIdForInvalidate) {
        void queryClient.invalidateQueries({
          queryKey: holdingGroupKeys.detail(holdingGroupIdForInvalidate),
        })
      }
    },
  })
}
