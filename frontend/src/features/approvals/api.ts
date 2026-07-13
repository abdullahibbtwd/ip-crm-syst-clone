import { apiClient } from '@/lib/api-client'
import type {
  ClientApprovalRequest,
  CreateApprovalInput,
  DecideApprovalInput,
  UpdateApprovalInput,
} from './types'

export const approvalsApi = {
  listForMatter: (matterId: string) =>
    apiClient.get<ClientApprovalRequest[]>(`/matters/${matterId}/approvals`),

  create: (matterId: string, data: CreateApprovalInput) =>
    apiClient.post<ClientApprovalRequest>(`/matters/${matterId}/approvals`, data),

  update: (matterId: string, id: string, data: UpdateApprovalInput) =>
    apiClient.patch<ClientApprovalRequest>(
      `/matters/${matterId}/approvals/${id}`,
      data,
    ),

  submit: (matterId: string, id: string) =>
    apiClient.post<ClientApprovalRequest>(
      `/matters/${matterId}/approvals/${id}/submit`,
      {},
    ),

  portalList: () => apiClient.get<ClientApprovalRequest[]>('/portal/approvals'),

  portalDecide: (id: string, data: DecideApprovalInput) =>
    apiClient.post<ClientApprovalRequest>(`/portal/approvals/${id}/decide`, data),
}
