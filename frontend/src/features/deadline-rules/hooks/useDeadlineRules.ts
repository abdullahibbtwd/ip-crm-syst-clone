import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deadlineRulesApi } from '../api'
import { deadlineRulesKeys } from '../queryKeys'
import type {
  CreateDeadlineRuleInput,
  ListDeadlineRulesParams,
  UpdateDeadlineRuleInput,
} from '../types'

export function useDeadlineRules(params?: ListDeadlineRulesParams) {
  return useQuery({
    queryKey: deadlineRulesKeys.list(params),
    queryFn: () => deadlineRulesApi.list(params),
  })
}

export function useDeadlineRule(id: string | undefined) {
  return useQuery({
    queryKey: deadlineRulesKeys.detail(id ?? ''),
    queryFn: () => deadlineRulesApi.getById(id!),
    enabled: Boolean(id),
  })
}

export function useCreateDeadlineRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDeadlineRuleInput) => deadlineRulesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: deadlineRulesKeys.lists() }),
  })
}

export function useUpdateDeadlineRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeadlineRuleInput }) =>
      deadlineRulesApi.update(id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: deadlineRulesKeys.lists() })
      qc.invalidateQueries({ queryKey: deadlineRulesKeys.detail(vars.id) })
    },
  })
}

export function useDeactivateDeadlineRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deadlineRulesApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: deadlineRulesKeys.lists() }),
  })
}
