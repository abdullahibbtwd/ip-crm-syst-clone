import { apiClient } from '@/lib/api-client'

export type AiSummarizeTargetType = 'unlinked_email' | 'correspondence'

export type AiSummarizeResult = {
  summary: string
  cached: boolean
  model: string
}

export type DeadlineExplanationResult = {
  explanation: string
  cached: boolean
  manual: boolean
  model: string | null
}

export const aiApi = {
  summarize: (body: {
    targetId: string
    targetType: AiSummarizeTargetType
    text?: string
  }) => apiClient.post<AiSummarizeResult>('/ai/summarize', body),
}

export const deadlineAiApi = {
  explanation: (id: string) =>
    apiClient.get<DeadlineExplanationResult>(`/deadlines/${id}/explanation`),
}
