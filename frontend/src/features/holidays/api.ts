import { apiClient } from '@/lib/api-client'
import type {
  CreateHolidayInput,
  Holiday,
  ListHolidaysParams,
  UpdateHolidayInput,
} from './types'

export const holidaysApi = {
  list: (params?: ListHolidaysParams) =>
    apiClient.get<Holiday[]>('/holidays', params as Record<string, unknown>),

  create: (data: CreateHolidayInput) => apiClient.post<Holiday>('/holidays', data),

  update: (id: string, data: UpdateHolidayInput) =>
    apiClient.patch<Holiday>(`/holidays/${id}`, data),

  remove: (id: string) => apiClient.delete<Holiday>(`/holidays/${id}`),
}
