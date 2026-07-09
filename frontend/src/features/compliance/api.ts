import { apiClient } from '@/lib/api-client'

export type AuditLogItem = {
  id: string
  action: string
  resource: string
  resourceId: string | null
  module: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user: { id: string; email: string; fullName: string } | null
  userEmail: string | null
  ipAddress: string | null
}

export type AuditListResponse = {
  items: AuditLogItem[]
  nextCursor: string | null
}

export type GdprExportBundle = Record<string, unknown>

export const complianceApi = {
  getClientDataAccess: (clientId: string, params?: { cursor?: string; limit?: number }) =>
    apiClient.get<AuditListResponse>(`/clients/${clientId}/data-access`, params),

  exportClientData: (clientId: string) =>
    apiClient.post<GdprExportBundle>(`/clients/${clientId}/data-export`, {}),

  listDataExports: (params?: { clientId?: string; cursor?: string; limit?: number }) =>
    apiClient.get<AuditListResponse>('/compliance/data-exports', params),

  listAuditTrail: (params?: {
    resource?: string
    action?: string
    userId?: string
    from?: string
    to?: string
    cursor?: string
    limit?: number
  }) => apiClient.get<AuditListResponse>('/audit', params),
}
