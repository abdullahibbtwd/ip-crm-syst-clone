import { apiClient } from '@/lib/api-client'
import type {
  CreateJurisdictionInput,
  Jurisdiction,
  ListJurisdictionsParams,
  UpdateJurisdictionInput,
} from './types'

export const jurisdictionsApi = {
  list: (params?: ListJurisdictionsParams) =>
    apiClient.get<Jurisdiction[]>(
      '/jurisdictions',
      params as Record<string, unknown>,
    ),

  getById: (id: string) => apiClient.get<Jurisdiction>(`/jurisdictions/${id}`),

  getByCode: (code: string) =>
    apiClient.get<Jurisdiction>(
      `/jurisdictions/code/${encodeURIComponent(code)}`,
    ),

  create: (data: CreateJurisdictionInput) =>
    apiClient.post<Jurisdiction>('/jurisdictions', data),

  update: (id: string, data: UpdateJurisdictionInput) =>
    apiClient.patch<Jurisdiction>(`/jurisdictions/${id}`, data),

  deactivate: (id: string) =>
    apiClient.delete<Jurisdiction>(`/jurisdictions/${id}`),
}
