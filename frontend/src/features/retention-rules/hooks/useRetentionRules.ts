import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { retentionRulesApi } from '../api'
import { retentionRulesKeys } from '../queryKeys'
import type { CreateRetentionRuleInput, UpdateRetentionRuleInput } from '../types'

export function useRetentionRules() {
  return useQuery({
    queryKey: retentionRulesKeys.list(),
    queryFn: () => retentionRulesApi.list(),
  })
}

export function useRetentionRule(id: string | undefined) {
  return useQuery({
    queryKey: retentionRulesKeys.detail(id ?? ''),
    queryFn: () => retentionRulesApi.getById(id!),
    enabled: Boolean(id),
  })
}

export function useRetentionDryRun() {
  return useMutation({
    mutationFn: (id: string) => retentionRulesApi.dryRun(id),
  })
}

export function useCreateRetentionRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRetentionRuleInput) => retentionRulesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: retentionRulesKeys.lists() }),
  })
}

export function useUpdateRetentionRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRetentionRuleInput }) =>
      retentionRulesApi.update(id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: retentionRulesKeys.lists() })
      qc.invalidateQueries({ queryKey: retentionRulesKeys.detail(vars.id) })
    },
  })
}

export function useDeactivateRetentionRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => retentionRulesApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: retentionRulesKeys.lists() }),
  })
}
