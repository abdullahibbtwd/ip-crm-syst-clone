import { apiClient } from '@/lib/api-client'
import type {
  CreatePartnerInput,
  CreatePartnerInstructionInput,
  ListPartnerInstructionsParams,
  ListPartnersParams,
  Partner,
  PartnerInstruction,
  TransitionPartnerInstructionInput,
  UpdatePartnerInput,
  UpdatePartnerInstructionInput,
} from './types'

export const partnersApi = {
  list: (params?: ListPartnersParams) =>
    apiClient.get<Partner[]>('/partners', params as Record<string, unknown>),

  getById: (id: string) => apiClient.get<Partner>(`/partners/${id}`),

  create: (data: CreatePartnerInput) => apiClient.post<Partner>('/partners', data),

  update: (id: string, data: UpdatePartnerInput) =>
    apiClient.patch<Partner>(`/partners/${id}`, data),

  deactivate: (id: string) => apiClient.delete<Partner>(`/partners/${id}`),
}

export const partnerInstructionsApi = {
  listForMatter: (matterId: string, params?: ListPartnerInstructionsParams) =>
    apiClient.get<PartnerInstruction[]>(
      `/matters/${matterId}/partner-instructions`,
      params as Record<string, unknown>,
    ),

  create: (matterId: string, data: CreatePartnerInstructionInput) =>
    apiClient.post<PartnerInstruction>(
      `/matters/${matterId}/partner-instructions`,
      data,
    ),

  update: (matterId: string, id: string, data: UpdatePartnerInstructionInput) =>
    apiClient.patch<PartnerInstruction>(
      `/matters/${matterId}/partner-instructions/${id}`,
      data,
    ),

  transition: (matterId: string, id: string, data: TransitionPartnerInstructionInput) =>
    apiClient.post<PartnerInstruction>(
      `/matters/${matterId}/partner-instructions/${id}/transition`,
      data,
    ),
}
