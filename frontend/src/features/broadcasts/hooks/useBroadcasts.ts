import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { broadcastsApi, type BroadcastAudience, type CreateBroadcastInput } from '../api'

export const broadcastKeys = {
  all: ['broadcasts'] as const,
  list: () => [...broadcastKeys.all, 'list'] as const,
  detail: (id: string) => [...broadcastKeys.all, id] as const,
}

export function useBroadcasts() {
  return useQuery({
    queryKey: broadcastKeys.list(),
    queryFn: () => broadcastsApi.list(),
  })
}

export function usePreviewBroadcastAudience(
  audience: BroadcastAudience | null,
  clientIds?: string[],
  enabled = true,
) {
  return useQuery({
    queryKey: [...broadcastKeys.all, 'preview', audience, clientIds ?? []],
    queryFn: () => broadcastsApi.preview(audience!, clientIds),
    enabled: Boolean(audience) && enabled,
  })
}

export function useCreateBroadcast() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateBroadcastInput) => broadcastsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: broadcastKeys.list() })
    },
  })
}
