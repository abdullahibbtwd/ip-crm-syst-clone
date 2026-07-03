import { apiClient } from '@/lib/api-client'
import type {
  AllDeadlinesFilters,
  CreateDeadlineInput,
  Deadline,
  DeadlineListResponse,
  DeadlineStatus,
  MyDeadlinesFilters,
} from './types'

export const deadlinesApi = {
  listForMatter: (matterId: string) =>
    apiClient.get<Deadline[]>(`/matters/${matterId}/deadlines`),

  listMy: (params?: MyDeadlinesFilters) =>
    apiClient.get<DeadlineListResponse>('/deadlines/my', params as Record<string, unknown>),

  myTodayCount: () => apiClient.get<{ count: number }>('/deadlines/my/today-count'),

  firmTodayCount: () => apiClient.get<{ count: number }>('/deadlines/today-count'),

  listAll: (params?: AllDeadlinesFilters) =>
    apiClient.get<DeadlineListResponse>('/deadlines', params as Record<string, unknown>),

  create: (data: CreateDeadlineInput) => apiClient.post<Deadline>('/deadlines', data),

  updateStatus: (id: string, status: DeadlineStatus) =>
    apiClient.patch<Deadline>(`/deadlines/${id}`, { status }),

  listAssignees: () =>
    apiClient.get<Array<{ id: string; fullName: string; email: string }>>(
      '/users/deadline-assignees',
    ),
}
