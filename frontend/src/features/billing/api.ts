import { apiClient } from '@/lib/api-client'
import type {
  BillingSummary,
  CreateFixedFeeInput,
  CreateTimeEntryInput,
  FixedFee,
  ResolvedRate,
  TimeEntry,
  UpdateFixedFeeInput,
  UpdateTimeEntryInput,
} from './types'

export const billingApi = {
  listTimeEntries: (matterId: string) =>
    apiClient.get<TimeEntry[]>(`/matters/${matterId}/time-entries`),

  createTimeEntry: (matterId: string, data: CreateTimeEntryInput) =>
    apiClient.post<TimeEntry>(`/matters/${matterId}/time-entries`, data),

  updateTimeEntry: (id: string, data: UpdateTimeEntryInput) =>
    apiClient.patch<TimeEntry>(`/time-entries/${id}`, data),

  deleteTimeEntry: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(`/time-entries/${id}`),

  listFixedFees: (matterId: string) =>
    apiClient.get<FixedFee[]>(`/matters/${matterId}/fixed-fees`),

  createFixedFee: (matterId: string, data: CreateFixedFeeInput) =>
    apiClient.post<FixedFee>(`/matters/${matterId}/fixed-fees`, data),

  updateFixedFee: (id: string, data: UpdateFixedFeeInput) =>
    apiClient.patch<FixedFee>(`/fixed-fees/${id}`, data),

  deleteFixedFee: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(`/fixed-fees/${id}`),

  getSummary: (matterId: string) =>
    apiClient.get<BillingSummary>(`/matters/${matterId}/billing-summary`),

  resolveRate: (matterId: string) =>
    apiClient.get<ResolvedRate>('/rate-cards/resolve', { matterId }),
}
