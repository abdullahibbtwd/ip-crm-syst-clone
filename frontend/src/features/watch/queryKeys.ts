import type { WatchAlertFilters } from './types'

export const watchKeys = {
  all: ['watch'] as const,
  profiles: (clientId: string) => [...watchKeys.all, 'profiles', clientId] as const,
  alerts: () => [...watchKeys.all, 'alerts'] as const,
  alertList: (filters: WatchAlertFilters) => [...watchKeys.alerts(), filters] as const,
  alert: (id: string) => [...watchKeys.alerts(), id] as const,
}
