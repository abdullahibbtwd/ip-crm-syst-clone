import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { precedentsApi } from '../api'
import { precedentKeys } from '../queryKeys'
import type {
  CreatePrecedentInput,
  HarvestPrecedentInput,
  ListPrecedentsParams,
  UpdatePrecedentInput,
} from '../types'

export function usePrecedents(params?: ListPrecedentsParams, enabled = true) {
  return useQuery({
    queryKey: precedentKeys.list(params),
    queryFn: () => precedentsApi.list(params),
    enabled,
  })
}

export function usePrecedent(id: string | null) {
  return useQuery({
    queryKey: precedentKeys.detail(id ?? ''),
    queryFn: () => precedentsApi.get(id!),
    enabled: Boolean(id),
  })
}

export function useCreatePrecedent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePrecedentInput) => precedentsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: precedentKeys.lists() }),
  })
}

export function useUpdatePrecedent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePrecedentInput }) =>
      precedentsApi.update(id, data),
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: precedentKeys.lists() })
      qc.invalidateQueries({ queryKey: precedentKeys.detail(vars.id) })
    },
  })
}

export function usePublishPrecedent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => precedentsApi.publish(id),
    onSuccess: (_row, id) => {
      qc.invalidateQueries({ queryKey: precedentKeys.lists() })
      qc.invalidateQueries({ queryKey: precedentKeys.detail(id) })
    },
  })
}

export function useArchivePrecedent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => precedentsApi.archive(id),
    onSuccess: (_row, id) => {
      qc.invalidateQueries({ queryKey: precedentKeys.lists() })
      qc.invalidateQueries({ queryKey: precedentKeys.detail(id) })
    },
  })
}

export function useHarvestPrecedent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      correspondenceId,
      data,
    }: {
      correspondenceId: string
      data: HarvestPrecedentInput
    }) => precedentsApi.fromCorrespondence(correspondenceId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: precedentKeys.lists() }),
  })
}
