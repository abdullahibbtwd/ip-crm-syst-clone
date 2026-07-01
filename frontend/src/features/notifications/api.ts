import { apiClient } from '@/lib/api-client'
import type { Notification, NotificationListResponse } from './types'

export const notificationsApi = {
  list: (params?: { limit?: number; cursor?: string }) =>
    apiClient.get<NotificationListResponse>('/notifications', params as Record<string, unknown>),

  unreadCount: () =>
    apiClient.get<{ count: number }>('/notifications/unread-count'),

  markRead: (id: string) =>
    apiClient.patch<Notification>(`/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.patch<{ updated: number }>('/notifications/read-all'),
}
