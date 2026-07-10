import { apiClient } from '@/lib/api-client'
import type {
  CreateRetentionRuleInput,
  RetentionDryRunResult,
  RetentionRule,
  UpdateRetentionRuleInput,
} from './types'

export const retentionRulesApi = {
  list: () => apiClient.get<RetentionRule[]>('/retention-rules'),

  getById: (id: string) => apiClient.get<RetentionRule>(`/retention-rules/${id}`),

  dryRun: (id: string) =>
    apiClient.get<RetentionDryRunResult>(`/retention-rules/${id}/dry-run`),

  create: (data: CreateRetentionRuleInput) =>
    apiClient.post<RetentionRule>('/retention-rules', data),

  update: (id: string, data: UpdateRetentionRuleInput) =>
    apiClient.patch<RetentionRule>(`/retention-rules/${id}`, data),

  deactivate: (id: string) => apiClient.delete<RetentionRule>(`/retention-rules/${id}`),
}
