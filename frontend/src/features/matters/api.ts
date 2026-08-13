import { apiClient } from '@/lib/api-client'
import type {
  CreateIpRightInput,
  CreateMatterInput,
  FileIpRightInput,
  IpRight,
  MatterDetail,
  MatterFilters,
  MatterListResponse,
  UpdateMatterInput,
} from './types'

export type MatterShelfCounts = {
  all: number
  archived: number
  others: number
  drafts: number
  byType: Record<string, number>
}

export const mattersApi = {
  list: (filters?: MatterFilters) =>
    apiClient.get<MatterListResponse>('/matters', filters as Record<string, unknown>),

  shelfCounts: () => apiClient.get<MatterShelfCounts>('/matters/shelf-counts'),

  get: (id: string) => apiClient.get<MatterDetail>(`/matters/${id}`),

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
}
