import { apiClient } from '@/lib/api-client'

export type BroadcastAudience =
  | 'active_clients'
  | 'pending_eu_renewals'
  | 'trademark_matters'
  | 'manual'

export type BroadcastStatus = 'queued' | 'sending' | 'completed' | 'failed'

export type AudienceRecipient = {
  clientId: string
  email: string
  displayName: string
}

export type BroadcastListItem = {
  id: string
  subject: string
  audience: BroadcastAudience
  status: BroadcastStatus
  totalRecipients: number
  sentCount: number
  failedCount: number
  createdAt: string
  completedAt: string | null
  createdBy: { id: string; fullName: string; email: string }
}

export type CreateBroadcastInput = {
  audience: BroadcastAudience
  subject: string
  bodyText: string
  bodyHtml?: string
  clientIds?: string[]
}

export const BROADCAST_AUDIENCE_OPTIONS: Array<{ value: BroadcastAudience }> = [
  { value: 'active_clients' },
  { value: 'pending_eu_renewals' },
  { value: 'trademark_matters' },
  { value: 'manual' },
]

export const broadcastsApi = {
  list: () => apiClient.get<BroadcastListItem[]>('/broadcasts'),

  get: (id: string) => apiClient.get<BroadcastListItem & { recipients: unknown[] }>(`/broadcasts/${id}`),

  preview: (audience: BroadcastAudience, clientIds?: string[]) =>
    apiClient.post<{ count: number; recipients: AudienceRecipient[] }>(
      '/broadcasts/preview',
      { audience, clientIds },
    ),

  create: (body: CreateBroadcastInput) =>
    apiClient.post<BroadcastListItem & { recipientPreview: AudienceRecipient[] }>(
      '/broadcasts',
      body,
    ),
}
