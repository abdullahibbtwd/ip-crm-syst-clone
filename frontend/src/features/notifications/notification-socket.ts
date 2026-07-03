import type { QueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { io, type Socket } from 'socket.io-client'
import { deadlineKeys } from '@/features/deadlines/queryKeys'
import { notificationKeys } from '@/features/notifications/queryKeys'

const SOCKET_PATH = '/socket.io'
const NOTIFICATIONS_NAMESPACE = '/notifications'

// Default: relative namespace → goes through the Vite proxy (same origin).
// Set VITE_SOCKET_URL (e.g. http://localhost:3002) to bypass the proxy and
// connect directly to the backend — useful for isolating proxy vs server issues.
const SOCKET_TARGET = import.meta.env.VITE_SOCKET_URL
  ? `${import.meta.env.VITE_SOCKET_URL}${NOTIFICATIONS_NAMESPACE}`
  : NOTIFICATIONS_NAMESPACE

let socket: Socket | null = null
let subscriberCount = 0
let queryClient: QueryClient | null = null
let refreshAttempted = false

function invalidateNotificationQueries() {
  if (!queryClient) return
  queryClient.invalidateQueries({ queryKey: notificationKeys.all })
  queryClient.invalidateQueries({ queryKey: deadlineKeys.myTodayCount() })
  queryClient.invalidateQueries({ queryKey: deadlineKeys.firmTodayCount() })
}

function attachSocketListeners(instance: Socket) {
  instance.on('connect', () => {
    refreshAttempted = false
    if (import.meta.env.DEV) {
      console.info(`[notifications] socket connected → ${SOCKET_TARGET}`)
    }
    invalidateNotificationQueries()
  })
  instance.on('connect_error', (err) => {
    if (import.meta.env.DEV) {
      console.warn(`[notifications] socket connect_error: ${err.message}`)
    }

    const isAuthFailure =
      err.message === 'Unauthorized' ||
      err.message.toLowerCase().includes('unauthorized')

    if (!isAuthFailure || refreshAttempted) return

    refreshAttempted = true
    void axios
      .post('/api/auth/refresh', {}, { withCredentials: true })
      .then(() => {
        refreshAttempted = false
        instance.connect()
      })
      .catch(() => {
        refreshAttempted = false
      })
  })
  instance.on('notification', invalidateNotificationQueries)
  instance.on('unread_count', () => {
    if (!queryClient) return
    queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
    queryClient.invalidateQueries({ queryKey: notificationKeys.list() })
  })
}

function ensureSocket() {
  if (socket) return socket

  socket = io(SOCKET_TARGET, {
    path: SOCKET_PATH,
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 20,
    reconnectionDelay: 2000,
  })

  attachSocketListeners(socket)
  return socket
}

function teardownSocket() {
  if (!socket) return
  socket.removeAllListeners()
  socket.disconnect()
  socket = null
}

/** One shared Socket.io connection for the whole app session. */
export function subscribeNotificationSocket(qc: QueryClient): () => void {
  queryClient = qc
  subscriberCount += 1
  ensureSocket()

  return () => {
    subscriberCount = Math.max(0, subscriberCount - 1)
    if (subscriberCount === 0) {
      queryClient = null
      teardownSocket()
    }
  }
}

export function disconnectNotificationSocket() {
  subscriberCount = 0
  queryClient = null
  teardownSocket()
}
