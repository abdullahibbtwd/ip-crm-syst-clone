import { apiClient } from '@/lib/api-client'
import type { Counterparty, IntakeFilters, IntakeLead, IntakeListResponse } from './types'
import type { ConvertIntakeFormValues, CounterpartyFormValues, CreateIntakeFormValues } from './schemas'

export const intakeApi = {
  list: (filters?: IntakeFilters) =>
    apiClient.get<IntakeListResponse>('/intake', filters as Record<string, unknown>),

  get: (id: string) => apiClient.get<IntakeLead>(`/intake/${id}`),

  create: (data: CreateIntakeFormValues) =>
    apiClient.post<IntakeLead>('/intake', data),

  updateMine: (id: string, data: CreateIntakeFormValues) =>
    apiClient.patch<IntakeLead>(`/intake/mine/${id}`, data),

  pendingCount: () => apiClient.get<{ count: number }>('/intake/pending-count'),

  addCounterparty: (id: string, data: CounterpartyFormValues) =>
    apiClient.post<Counterparty>(`/intake/${id}/counterparties`, data),

  removeCounterparty: (id: string, counterpartyId: string) =>
    apiClient.delete<IntakeLead>(`/intake/${id}/counterparties/${counterpartyId}`),

  runConflictCheck: (id: string) =>
    apiClient.post<IntakeLead>(`/intake/${id}/conflict-check`),

  resolveConflict: (
    id: string,
    data: { decision: 'approved' | 'rejected' | 'overridden'; note?: string },
  ) => apiClient.post<IntakeLead>(`/intake/${id}/resolve-conflict`, data),

  convert: (id: string, data: ConvertIntakeFormValues) =>
    apiClient.post<IntakeLead>(`/intake/${id}/convert`, data),
}
