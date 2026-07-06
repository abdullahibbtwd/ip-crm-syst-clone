import { apiClient } from '@/lib/api-client'
import type {
  CompleteRenewalInput,
  InstructRenewalInput,
  RegisterIpRightInput,
  RenewalFilters,
  RenewalListResponse,
  RenewalWindow,
  RenewalWorklistItem,
} from './types'

export const renewalsApi = {
  list: (filters?: RenewalFilters) =>
    apiClient.get<RenewalListResponse>('/renewals', filters as Record<string, unknown>),

  listMy: (filters?: RenewalFilters) =>
    apiClient.get<RenewalListResponse>('/renewals/my', filters as Record<string, unknown>),

  get: (id: string) => apiClient.get<RenewalWindow>(`/renewals/${id}`),

  listForIpRight: (matterId: string, ipRightId: string) =>
    apiClient.get<RenewalWindow[]>(
      `/matters/${matterId}/ip-rights/${ipRightId}/renewals`,
    ),

  registerIpRight: (matterId: string, ipRightId: string, data: RegisterIpRightInput) =>
    apiClient.patch<{ ipRight: unknown; renewalWindow: RenewalWindow }>(
      `/matters/${matterId}/ip-rights/${ipRightId}/register`,
      data,
    ),

  instruct: (id: string, data: InstructRenewalInput) =>
    apiClient.post<RenewalWindow>(`/renewals/${id}/instruct`, data),

  markFiled: (id: string) => apiClient.post<RenewalWindow>(`/renewals/${id}/file`),

  complete: (id: string, data: CompleteRenewalInput) =>
    apiClient.post<RenewalWindow>(`/renewals/${id}/complete`, data),

  listPortal: () =>
    apiClient.get<RenewalWorklistItem[]>('/portal/renewals'),

  portalInstruct: (id: string, data: InstructRenewalInput) =>
    apiClient.post<RenewalWindow>(`/portal/renewals/${id}/instruct`, data),
}
