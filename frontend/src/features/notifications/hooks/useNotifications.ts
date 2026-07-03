import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { notificationsApi } from '@/features/notifications/api'
import {
  disconnectNotificationSocket,
  subscribeNotificationSocket,
} from '@/features/notifications/notification-socket'
import { notificationKeys } from '@/features/notifications/queryKeys'

export function useNotifications(limit = 20) {
  return useQuery({
    queryKey: notificationKeys.list(limit),
    queryFn: () => notificationsApi.list({ limit }),
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.unreadCount(),
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

/** Mount once at app shell level — reuses a single Socket.io connection. */
export function useNotificationSocket(enabled: boolean) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!enabled) {
      disconnectNotificationSocket()
      return
    }

    return subscribeNotificationSocket(qc)
  }, [enabled, qc])
}
