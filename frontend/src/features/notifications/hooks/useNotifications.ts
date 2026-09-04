import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/features/notifications/api'
import { useNotificationSyncContext } from '@/features/notifications/notification-sync-context'
import { notificationKeys } from '@/features/notifications/queryKeys'
import { useAuthReady } from '@/features/auth/AuthProvider'

const notificationQueryOptions = {
  refetchOnWindowFocus: true,
  refetchOnMount: 'always' as const,
  refetchOnReconnect: true,
  staleTime: 0,
  retry: 2,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 8_000),
}

export function useNotifications(limit = 20) {
  const authReady = useAuthReady()
  const { pollIntervalMs } = useNotificationSyncContext()

  return useQuery({
    queryKey: notificationKeys.list(limit),
    queryFn: () => notificationsApi.list({ limit }),
    ...notificationQueryOptions,
    enabled: authReady,
    refetchInterval: pollIntervalMs,
  })
}

export function useUnreadNotificationCount() {
  const authReady = useAuthReady()
  const { pollIntervalMs } = useNotificationSyncContext()

  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.unreadCount(),
    ...notificationQueryOptions,
    enabled: authReady,
    refetchInterval: pollIntervalMs,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}
