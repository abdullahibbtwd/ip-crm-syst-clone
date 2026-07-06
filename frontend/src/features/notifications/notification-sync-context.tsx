import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { deadlineKeys } from '@/features/deadlines/queryKeys'
import {
  disconnectNotificationSocket,
  onNotificationSocketStateChange,
  subscribeNotificationSocket,
} from '@/features/notifications/notification-socket'
import { notificationKeys } from '@/features/notifications/queryKeys'

/** HTTP poll while Socket.io is healthy (socket still pushes instant updates). */
export const NOTIFICATION_POLL_SOCKET_UP_MS = 60_000
/** Faster HTTP poll when the socket is down so the bell badge stays current. */
export const NOTIFICATION_POLL_SOCKET_DOWN_MS = 15_000

type NotificationSyncContextValue = {
  socketConnected: boolean
  pollIntervalMs: number
}

const NotificationSyncContext = createContext<NotificationSyncContextValue>({
  socketConnected: false,
  pollIntervalMs: NOTIFICATION_POLL_SOCKET_DOWN_MS,
})

export function useNotificationSyncContext() {
  return useContext(NotificationSyncContext)
}

function invalidateNotificationData(
  qc: ReturnType<typeof useQueryClient>,
) {
  void qc.invalidateQueries({ queryKey: notificationKeys.all })
  void qc.invalidateQueries({ queryKey: deadlineKeys.myTodayCount() })
  void qc.invalidateQueries({ queryKey: deadlineKeys.firmTodayCount() })
}

export function NotificationSyncProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const qc = useQueryClient()
  const [socketConnected, setSocketConnected] = useState(false)

  const pollIntervalMs = socketConnected
    ? NOTIFICATION_POLL_SOCKET_UP_MS
    : NOTIFICATION_POLL_SOCKET_DOWN_MS

  useEffect(() => {
    if (!isAuthenticated) {
      setSocketConnected(false)
      disconnectNotificationSocket()
      return
    }

    // Always load from REST on login / refresh — do not wait for the socket.
    invalidateNotificationData(qc)

    const unsubscribeSocket = subscribeNotificationSocket(qc)
    const unsubscribeState = onNotificationSocketStateChange((state) => {
      const connected = state === 'connected'
      setSocketConnected(connected)
      if (!connected) {
        invalidateNotificationData(qc)
      }
    })

    const onOnline = () => invalidateNotificationData(qc)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        invalidateNotificationData(qc)
      }
    }

    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      unsubscribeSocket()
      unsubscribeState()
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
      disconnectNotificationSocket()
      setSocketConnected(false)
    }
  }, [isAuthenticated, qc])

  return (
    <NotificationSyncContext.Provider value={{ socketConnected, pollIntervalMs }}>
      {children}
    </NotificationSyncContext.Provider>
  )
}
