import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { correspondenceKeys } from '@/features/correspondence/queryKeys'
import { tasksApi } from '../api'
import { taskKeys } from '../queryKeys'
import type { CreateTaskInput, UpdateTaskInput } from '../types'

function invalidateTaskQueries(
  qc: ReturnType<typeof useQueryClient>,
  matterId?: string,
) {
  if (matterId) {
    qc.invalidateQueries({ queryKey: taskKeys.matter(matterId) })
  }
  qc.invalidateQueries({ queryKey: taskKeys.my() })
  if (matterId) {
    qc.invalidateQueries({ queryKey: correspondenceKeys.timeline(matterId) })
  }
}

export function useMatterTasks(matterId: string) {
  return useQuery({
    queryKey: taskKeys.matter(matterId),
    queryFn: () => tasksApi.listForMatter(matterId),
    enabled: Boolean(matterId),
  })
}

export function useMyTasks(limit = 8) {
  return useQuery({
    queryKey: taskKeys.my({ limit }),
    queryFn: () => tasksApi.listMy({ limit }),
  })
}

export function useTeamMembers(enabled = true) {
  return useQuery({
    queryKey: ['users', 'team-members'],
    queryFn: () => tasksApi.listTeamMembers(),
    enabled,
    staleTime: 60_000,
  })
}

export function useCreateTask(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskInput) => tasksApi.create(matterId, data),
    onSuccess: () => invalidateTaskQueries(qc, matterId),
  })
}

export function useUpdateTask(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      tasksApi.update(id, data),
    onSuccess: () => invalidateTaskQueries(qc, matterId),
  })
}

export function useDeleteTask(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => invalidateTaskQueries(qc, matterId),
  })
}
