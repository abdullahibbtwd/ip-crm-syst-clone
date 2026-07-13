import { apiClient } from '@/lib/api-client'

export type PortalMessageKind = 'broadcast' | 'correspondence'

export type PortalMessageListItem = {
  id: string
  kind: PortalMessageKind
  subject: string
  bodyText: string | null
  bodyHtml: string | null
  date: string
  readAt: string | null
  matter: {
    id: string
    title: string
    matterType: string
    status: string
  } | null
  direction: 'incoming' | 'outgoing'
  sourceId: string
  broadcastId: string | null
  correspondenceId: string | null
  documentVersion: {
    id: string
    version: number
    fileName: string
    document: { id: string; displayName: string }
  } | null
}

export type PortalMessagesResponse = {
  items: PortalMessageListItem[]
  total: number
}

export const portalMessagesApi = {
  list: () => apiClient.get<PortalMessagesResponse>('/portal/messages'),

  getBroadcast: (id: string) =>
    apiClient.get<PortalMessageListItem>(`/portal/messages/broadcast/${id}`),

  getCorrespondence: (id: string) =>
    apiClient.get<PortalMessageListItem>(`/portal/messages/correspondence/${id}`),
}
