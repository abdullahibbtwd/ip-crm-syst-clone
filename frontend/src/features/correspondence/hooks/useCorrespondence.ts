import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deadlineKeys } from '@/features/deadlines/queryKeys'
import { correspondenceApi } from '../api'
import { correspondenceKeys } from '../queryKeys'
import type { CorrespondenceStatus, CreateCorrespondenceInput } from '../types'

export function useMatterCorrespondence(matterId: string) {
  return useQuery({
    queryKey: correspondenceKeys.matter(matterId),
    queryFn: () => correspondenceApi.listForMatter(matterId),
    enabled: Boolean(matterId),
  })
}

export function useMatterTimeline(matterId: string) {
  return useQuery({
    queryKey: correspondenceKeys.timeline(matterId),
    queryFn: () => correspondenceApi.listTimeline(matterId),
    enabled: Boolean(matterId),
  })
}

export function useCreateCorrespondence(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCorrespondenceInput) =>
      correspondenceApi.create(matterId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: correspondenceKeys.matter(matterId) })
      qc.invalidateQueries({ queryKey: correspondenceKeys.timeline(matterId) })
      qc.invalidateQueries({ queryKey: deadlineKeys.matter(matterId) })
      qc.invalidateQueries({ queryKey: deadlineKeys.my() })
    },
  })
}

export function useUpdateCorrespondenceStatus(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CorrespondenceStatus }) =>
      correspondenceApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: correspondenceKeys.matter(matterId) })
    },
  })
}
