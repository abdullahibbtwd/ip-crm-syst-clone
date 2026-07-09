import { apiClient } from '@/lib/api-client'
import type { CorrespondenceCategory } from '@/features/correspondence/types'
import type {
  EmailQueueStats,
  LinkEmailResult,
  MailboxConnection,
  MailboxProviderInfo,
  QueuedEmailPreview,
  UnlinkedEmail,
} from './types'

export const emailIntegrationApi = {
  getProviders: () =>
    apiClient.get<MailboxProviderInfo[]>('/email-integration/providers'),

  listConnections: () =>
    apiClient.get<MailboxConnection[]>('/email-integration/connections'),

  connectUrl: (provider: string) => `/api/email-integration/connect/${provider}`,

  revokeConnection: (id: string) =>
    apiClient.delete<MailboxConnection>(`/email-integration/connections/${id}`),

  syncNow: () =>
    apiClient.post<{ ingested: number }>('/email-integration/sync-now'),

  fetchEmails: () =>
    apiClient.post<{ ingested: number; limit: number }>('/email-integration/fetch'),

  listQueue: () => apiClient.get<UnlinkedEmail[]>('/email-queue'),

  queueStats: () => apiClient.get<EmailQueueStats>('/email-queue/stats'),

  getQueueItem: (id: string) => apiClient.get<UnlinkedEmail>(`/email-queue/${id}`),

  getPreview: (id: string) => apiClient.get<QueuedEmailPreview>(`/email-queue/${id}/preview`),

  linkToMatter: (id: string, matterId: string, category?: CorrespondenceCategory) =>
    apiClient.post<LinkEmailResult>(`/email-queue/${id}/link`, { matterId, category }),

  dismiss: (id: string) => apiClient.post<UnlinkedEmail>(`/email-queue/${id}/dismiss`),

  download: (id: string) =>
    apiClient.get<{ url: string; fileName: string; mimeType: string }>(
      `/email-queue/${id}/download`,
    ),
}
