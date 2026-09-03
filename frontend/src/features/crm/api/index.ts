import { apiClient } from '@/lib/api-client'
import type {
  ClientAddressInsights,
  ClientDetail,
  ClientFilters,
  ClientListItem,
  ClientNote,
  ClientOffice,
  ClientSummary,
  ClientTabCounts,
  Contact,
  ContactRole,
  GlobalContactFilters,
  HoldingGroup,
  HoldingGroupDetail,
  Paginated,
  RelatedCompany,
  RelationshipHistoryEntry,
} from '../types'

export const holdingGroupsApi = {
  list: (params?: { search?: string; cursor?: string; limit?: number }) =>
    apiClient.get<Paginated<HoldingGroup>>('/holding-groups', params),

  get: (id: string) => apiClient.get<HoldingGroupDetail>(`/holding-groups/${id}`),

  create: (data: { name: string; description?: string; country?: string }) =>
    apiClient.post<HoldingGroup>('/holding-groups', data),

  update: (id: string, data: { name?: string; description?: string; country?: string }) =>
    apiClient.patch<HoldingGroup>(`/holding-groups/${id}`, data),
}

export const clientsApi = {
  list: (filters: ClientFilters = {}) =>
    apiClient.get<Paginated<ClientListItem>>('/clients', filters as Record<string, unknown>),

  get: (id: string) => apiClient.get<ClientDetail>(`/clients/${id}`),

  summary: (id: string) => apiClient.get<ClientSummary>(`/clients/${id}/summary`),

  addressInsights: (id: string) =>
    apiClient.get<ClientAddressInsights>(`/clients/${id}/address-insights`),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch<ClientDetail>(`/clients/${id}`, data),

  create: (data: Record<string, unknown>) =>
    apiClient.post<ClientDetail>('/clients', data),

  archive: (id: string) => apiClient.delete<ClientDetail>(`/clients/${id}`),

  tabCounts: (id: string) => apiClient.get<ClientTabCounts>(`/clients/${id}/tab-counts`),

  listDeadlines: (id: string) =>
    apiClient.get<import('@/features/deadlines/types').Deadline[]>(
      `/clients/${id}/deadlines`,
    ),
}

export const officesApi = {
  list: (clientId: string) =>
    apiClient.get<ClientOffice[]>(`/clients/${clientId}/offices`),

  create: (clientId: string, data: Partial<ClientOffice>) =>
    apiClient.post<ClientOffice>(`/clients/${clientId}/offices`, data),

  update: (clientId: string, officeId: string, data: Partial<ClientOffice>) =>
    apiClient.patch<ClientOffice>(`/clients/${clientId}/offices/${officeId}`, data),

  remove: (clientId: string, officeId: string) =>
    apiClient.delete<{ deleted: boolean }>(`/clients/${clientId}/offices/${officeId}`),

  upsertTyped: (
    clientId: string,
    addressType: 'registered_legal' | 'correspondence',
    data: Partial<ClientOffice>,
  ) =>
    apiClient.put<ClientOffice>(
      `/clients/${clientId}/offices/by-type/${addressType}`,
      data,
    ),
}

export const contactsApi = {
  list: (clientId: string, role?: ContactRole) =>
    apiClient.get<Contact[]>(`/clients/${clientId}/contacts`, role ? { role } : undefined),

  create: (clientId: string, data: Record<string, unknown>) =>
    apiClient.post<Contact>(`/clients/${clientId}/contacts`, data),

  update: (clientId: string, contactId: string, data: Record<string, unknown>) =>
    apiClient.patch<Contact>(`/clients/${clientId}/contacts/${contactId}`, data),

  deactivate: (clientId: string, contactId: string) =>
    apiClient.delete<Contact>(`/clients/${clientId}/contacts/${contactId}`),

  listGlobal: (filters: GlobalContactFilters = {}) =>
    apiClient.get<Paginated<Contact>>('/contacts', filters as Record<string, unknown>),
}

export const relatedCompaniesApi = {
  list: (clientId: string) =>
    apiClient.get<RelatedCompany[]>(`/clients/${clientId}/related-companies`),

  create: (clientId: string, data: Record<string, unknown>) =>
    apiClient.post<RelatedCompany>(`/clients/${clientId}/related-companies`, data),

  remove: (clientId: string, relId: string) =>
    apiClient.delete<{ deleted: boolean }>(
      `/clients/${clientId}/related-companies/${relId}`,
    ),
}

export const historyApi = {
  list: (clientId: string, params?: { cursor?: string; limit?: number }) =>
    apiClient.get<Paginated<RelationshipHistoryEntry>>(
      `/clients/${clientId}/history`,
      params,
    ),
}

export const clientNotesApi = {
  list: (clientId: string) =>
    apiClient.get<ClientNote[]>(`/clients/${clientId}/notes`),

  create: (clientId: string, data: { body: string }) =>
    apiClient.post<ClientNote>(`/clients/${clientId}/notes`, data),

  update: (clientId: string, noteId: string, data: { body: string }) =>
    apiClient.patch<ClientNote>(`/clients/${clientId}/notes/${noteId}`, data),

  remove: (clientId: string, noteId: string) =>
    apiClient.delete<{ deleted: boolean }>(`/clients/${clientId}/notes/${noteId}`),
}
