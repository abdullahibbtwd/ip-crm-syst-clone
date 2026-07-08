import { apiClient } from '@/lib/api-client'
import type {
  AcceptWatchAlertResponse,
  CreateMockWatchAlertInput,
  CreateWatchProfileInput,
  WatchAlert,
  WatchAlertFilters,
  WatchAlertListResponse,
  WatchProfile,
  WatchProfileListResponse,
  WatchProfileStatus,
} from './types'

export const watchApi = {
  listProfiles: (clientId: string) =>
    apiClient.get<WatchProfileListResponse>(`/clients/${clientId}/watch-profiles`),

  createProfile: (clientId: string, data: CreateWatchProfileInput) =>
    apiClient.post<WatchProfile>(`/clients/${clientId}/watch-profiles`, data),

  updateProfileStatus: (id: string, status: WatchProfileStatus) =>
    apiClient.patch<WatchProfile>(`/watch-profiles/${id}`, { status }),

  listAlerts: (filters?: WatchAlertFilters) =>
    apiClient.get<WatchAlertListResponse>('/watch-alerts', filters as Record<string, unknown>),

  getAlert: (id: string) => apiClient.get<WatchAlert>(`/watch-alerts/${id}`),

  createMockAlert: (data: CreateMockWatchAlertInput) =>
    apiClient.post<WatchAlert>('/watch-alerts/mock', data),

  rejectAlert: (id: string) => apiClient.post<WatchAlert>(`/watch-alerts/${id}/reject`),

  acceptAlert: (id: string) =>
    apiClient.post<AcceptWatchAlertResponse>(`/watch-alerts/${id}/accept`),
}
