import { apiClient } from '@/lib/api-client'
import type {
  TrademarkActionInput,
  TrademarkActionResult,
} from './trademark-actions'
import type {
  CreateIpRightInput,
  CreateMatterInput,
  FileIpRightInput,
  IpRight,
  MatterDetail,
  MatterFilters,
  MatterListResponse,
  MatterTabCounts,
  UpdateMatterInput,
} from './types'

export type MatterShelfCounts = {
  all: number
  archived: number
  others: number
  drafts: number
  byType: Record<string, number>
  trademarkByProcedure?: Record<string, number>
}

export const mattersApi = {
  list: (filters?: MatterFilters) => {
    const params: MatterFilters = { ...filters }
    if (params.draftsOnly) {
      params.status = 'draft'
    } else if (params.status === 'draft') {
      delete params.status
    } else if (!params.status) {
      params.excludeDrafts = true
    }
    return apiClient.get<MatterListResponse>(
      '/matters',
      params as Record<string, unknown>,
    )
  },

  shelfCounts: () => apiClient.get<MatterShelfCounts>('/matters/shelf-counts'),

  get: (id: string) => apiClient.get<MatterDetail>(`/matters/${id}`),

  tabCounts: (id: string) => apiClient.get<MatterTabCounts>(`/matters/${id}/tab-counts`),

  create: (data: CreateMatterInput) => apiClient.post<MatterDetail>('/matters', data),

  update: (id: string, data: UpdateMatterInput) =>
    apiClient.patch<MatterDetail>(`/matters/${id}`, data),

  archive: (id: string) => apiClient.post<MatterDetail>(`/matters/${id}/archive`),

  restore: (id: string) => apiClient.post<MatterDetail>(`/matters/${id}/restore`),

  remove: (id: string) => apiClient.delete<{ deleted: boolean }>(`/matters/${id}`),

  listIpRights: (matterId: string) =>
    apiClient.get<IpRight[]>(`/matters/${matterId}/ip-rights`),

  createIpRight: (matterId: string, data: CreateIpRightInput) =>
    apiClient.post<IpRight>(`/matters/${matterId}/ip-rights`, data),

  fileIpRight: (matterId: string, ipRightId: string, data: FileIpRightInput) =>
    apiClient.post<IpRight>(`/matters/${matterId}/ip-rights/${ipRightId}/file`, data),

  recordTrademarkAction: (matterId: string, data: TrademarkActionInput) =>
    apiClient.post<TrademarkActionResult>(
      `/matters/${matterId}/trademark-actions`,
      data,
    ),

  getOppositionPdf: (matterId: string, lang?: string) =>
    apiClient.get<{ url: string; fileName: string; mimeType: string }>(
      `/matters/${matterId}/opposition-pdf`,
      lang ? { lang } : undefined,
    ),
}
