import { api } from '@/lib/api'
import { apiClient } from '@/lib/api-client'
import type {
  Correspondence,
  CreateCorrespondenceInput,
  MatterTimelineEvent,
  ParsedEmailResult,
  PortalCorrespondence,
  UpdateCorrespondenceInput,
} from './types'

export const correspondenceApi = {
  listForMatter: (matterId: string) =>
    apiClient.get<Correspondence[]>(`/matters/${matterId}/correspondence`),

  create: (matterId: string, data: CreateCorrespondenceInput) =>
    apiClient.post<Correspondence>(`/matters/${matterId}/correspondence`, data),

  parseEml: (matterId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<ParsedEmailResult>(`/matters/${matterId}/correspondence/parse-eml`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  parseText: (matterId: string, text: string) =>
    apiClient.post<ParsedEmailResult>(`/matters/${matterId}/correspondence/parse-text`, {
      text,
    }),

  update: (id: string, data: UpdateCorrespondenceInput) =>
    apiClient.patch<Correspondence>(`/correspondence/${id}`, data),

  updateStatus: (id: string, status: NonNullable<UpdateCorrespondenceInput['status']>) =>
    apiClient.patch<Correspondence>(`/correspondence/${id}`, { status }),

  attachDocument: (id: string, documentVersionId: string) =>
    apiClient.patch<Correspondence>(`/correspondence/${id}`, { documentVersionId }),

  listTimeline: (matterId: string) =>
    apiClient.get<MatterTimelineEvent[]>(`/matters/${matterId}/timeline`),

  portalList: () => apiClient.get<PortalCorrespondence[]>('/portal/correspondence'),

  portalGet: (id: string) =>
    apiClient.get<PortalCorrespondence>(`/portal/correspondence/${id}`),
}
