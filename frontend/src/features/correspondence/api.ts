import { apiClient } from '@/lib/api-client'
import type {
  Correspondence,
  CorrespondenceStatus,
  CreateCorrespondenceInput,
  MatterTimelineEvent,
} from './types'

export const correspondenceApi = {
  listForMatter: (matterId: string) =>
    apiClient.get<Correspondence[]>(`/matters/${matterId}/correspondence`),

  create: (matterId: string, data: CreateCorrespondenceInput) =>
    apiClient.post<Correspondence>(`/matters/${matterId}/correspondence`, data),

  updateStatus: (id: string, status: CorrespondenceStatus) =>
    apiClient.patch<Correspondence>(`/correspondence/${id}`, { status }),

  listTimeline: (matterId: string) =>
    apiClient.get<MatterTimelineEvent[]>(`/matters/${matterId}/timeline`),
}
