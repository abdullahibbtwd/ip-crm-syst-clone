import { apiClient } from '@/lib/api-client'
import type {
  CreateDeadlineRuleInput,
  DeadlineRule,
  ListDeadlineRulesParams,
  UpdateDeadlineRuleInput,
} from './types'

export const deadlineRulesApi = {
  list: (params?: ListDeadlineRulesParams) =>
    apiClient.get<DeadlineRule[]>('/deadline-rules', params as Record<string, unknown>),

  getById: (id: string) => apiClient.get<DeadlineRule>(`/deadline-rules/${id}`),

  create: (data: CreateDeadlineRuleInput) =>
    apiClient.post<DeadlineRule>('/deadline-rules', data),

  update: (id: string, data: UpdateDeadlineRuleInput) =>
    apiClient.patch<DeadlineRule>(`/deadline-rules/${id}`, data),

  deactivate: (id: string) => apiClient.delete<DeadlineRule>(`/deadline-rules/${id}`),
}
