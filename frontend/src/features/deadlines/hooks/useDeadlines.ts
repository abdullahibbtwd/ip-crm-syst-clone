import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { correspondenceKeys } from '@/features/correspondence/queryKeys'
import { deadlinesApi } from '../api'
import { deadlineKeys } from '../queryKeys'
import type {
  AllDeadlinesFilters,
  CreateDeadlineInput,
  DeadlineStatus,
  MyDeadlinesFilters,
} from '../types'

function invalidateDeadlineQueries(qc: ReturnType<typeof useQueryClient>, matterId?: string) {
  if (matterId) {
    qc.invalidateQueries({ queryKey: deadlineKeys.matter(matterId) })
  }
  qc.invalidateQueries({ queryKey: deadlineKeys.my() })
  qc.invalidateQueries({ queryKey: deadlineKeys.firm() })
  qc.invalidateQueries({ queryKey: deadlineKeys.myTodayCount() })
  qc.invalidateQueries({ queryKey: deadlineKeys.firmTodayCount() })
  qc.invalidateQueries({ queryKey: ['matters'] })
}

export function useMatterDeadlines(matterId: string) {
  return useQuery({
    queryKey: deadlineKeys.matter(matterId),
    queryFn: () => deadlinesApi.listForMatter(matterId),
    enabled: Boolean(matterId),
  })
}

export function useMyDeadlines(filters?: MyDeadlinesFilters) {
  return useQuery({
    queryKey: deadlineKeys.my(filters),
    queryFn: () => deadlinesApi.listMy(filters),
  })
}

export function useMyTodayDeadlineCount(enabled = true) {
  return useQuery({
    queryKey: deadlineKeys.myTodayCount(),
    queryFn: () => deadlinesApi.myTodayCount(),
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function useFirmTodayDeadlineCount(enabled = true) {
  return useQuery({
    queryKey: deadlineKeys.firmTodayCount(),
    queryFn: () => deadlinesApi.firmTodayCount(),
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function useAllDeadlines(filters?: AllDeadlinesFilters) {
  return useQuery({
    queryKey: deadlineKeys.firm(filters),
    queryFn: () => deadlinesApi.listAll(filters),
  })
}

export function useDeadlineAssignees(enabled = true) {
  return useQuery({
    queryKey: ['users', 'deadline-assignees'],
    queryFn: () => deadlinesApi.listAssignees(),
    enabled,
    staleTime: 60_000,
  })
}

export function useUpdateDeadlineStatus(matterId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DeadlineStatus }) =>
      deadlinesApi.updateStatus(id, status),
    onSuccess: () => invalidateDeadlineQueries(qc, matterId),
  })
}

export function useCreateDeadline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDeadlineInput) => deadlinesApi.create(data),
    onSuccess: (deadline) => {
      invalidateDeadlineQueries(qc, deadline.matterId)
      qc.invalidateQueries({ queryKey: correspondenceKeys.timeline(deadline.matterId) })
    },
  })
}
