import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { useEffect, useRef } from 'react'
import { notificationsApi } from '@/features/notifications/api'
import { notificationKeys } from '@/features/notifications/queryKeys'
import type { Notification } from '@/features/notifications/types'

const SOCKET_PATH = '/socket.io'

function getSocketUrl() {
  return import.meta.env.DEV ? window.location.origin : window.location.origin
}

export function useNotifications(limit = 20) {
  return useQuery({
    queryKey: notificationKeys.list(limit),
    queryFn: () => notificationsApi.list({ limit }),
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 60_000,
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

export function useNotificationSocket(enabled: boolean) {
  const qc = useQueryClient()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!enabled) return

    const socket = io(`${getSocketUrl()}/notifications`, {
      path: SOCKET_PATH,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    })
    socketRef.current = socket

    socket.on('notification', (_notification: Notification) => {
      qc.invalidateQueries({ queryKey: notificationKeys.all })
    })

    socket.on('unread_count', () => {
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
      qc.invalidateQueries({ queryKey: notificationKeys.list() })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled, qc])
}
