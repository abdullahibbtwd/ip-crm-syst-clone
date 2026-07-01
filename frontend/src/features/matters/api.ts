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

export const mattersApi = {
  list: (filters?: MatterFilters) =>
    apiClient.get<MatterListResponse>('/matters', filters as Record<string, unknown>),

  get: (id: string) => apiClient.get<MatterDetail>(`/matters/${id}`),

  create: (data: CreateMatterInput) => apiClient.post<MatterDetail>('/matters', data),

  update: (id: string, data: UpdateMatterInput) =>
    apiClient.patch<MatterDetail>(`/matters/${id}`, data),

  remove: (id: string) => apiClient.delete<{ deleted: boolean }>(`/matters/${id}`),

  listIpRights: (matterId: string) =>
    apiClient.get<IpRight[]>(`/matters/${matterId}/ip-rights`),

  createIpRight: (matterId: string, data: CreateIpRightInput) =>
    apiClient.post<IpRight>(`/matters/${matterId}/ip-rights`, data),

  fileIpRight: (matterId: string, ipRightId: string, data: FileIpRightInput) =>
    apiClient.post<IpRight>(`/matters/${matterId}/ip-rights/${ipRightId}/file`, data),
}
