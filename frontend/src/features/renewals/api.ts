import { apiClient } from '@/lib/api-client'
import type {
  CompleteRenewalInput,
  InstructRenewalInput,
  RecordRenewalPartPaymentInput,
  RegisterIpRightInput,
  RenewalFilters,
  RenewalListResponse,
  RenewalPart,
  RenewalWindow,
  RenewalWorklistItem,
  SplitRenewalWindowInput,
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

  listParts: (windowId: string) =>
    apiClient.get<RenewalPart[]>(`/renewals/windows/${windowId}/parts`),

  splitWindow: (windowId: string, data: SplitRenewalWindowInput) =>
    apiClient.post<RenewalWindow>(`/renewals/windows/${windowId}/parts/split`, data),

  instructPart: (partId: string, data: InstructRenewalInput) =>
    apiClient.post<RenewalWindow>(`/renewals/parts/${partId}/instruct`, data),

  markPartFiled: (partId: string) =>
    apiClient.post<RenewalWindow>(`/renewals/parts/${partId}/file`),

  recordPartPayment: (partId: string, data: RecordRenewalPartPaymentInput) =>
    apiClient.post<RenewalWindow>(`/renewals/parts/${partId}/payments`, data),

  completePart: (partId: string, data: CompleteRenewalInput) =>
    apiClient.post<RenewalWindow>(`/renewals/parts/${partId}/complete`, data),

  listPortal: () =>
    apiClient.get<RenewalWorklistItem[]>('/portal/renewals'),

  portalInstruct: (id: string, data: InstructRenewalInput) =>
    apiClient.post<RenewalWindow>(`/portal/renewals/${id}/instruct`, data),

  portalInstructPart: (partId: string, data: InstructRenewalInput) =>
    apiClient.post<RenewalWindow>(`/portal/renewals/parts/${partId}/instruct`, data),
}
