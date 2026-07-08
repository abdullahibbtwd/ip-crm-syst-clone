import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bell, CalendarClock, Clock, AlertTriangle } from 'lucide-react'

import { apiClient } from '@/lib/api-client'
import { ReportPanel } from '@/components/reports/report-ui'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useMarkNotificationRead } from '@/features/notifications/hooks/useNotifications'

type AlertsSummaryResponse = {
  generatedAt: string
  overdue: AlertItem[]
  today: AlertItem[]
  urgent: AlertItem[]
  notifications: AlertItem[]
}

type AlertItem = {
  id: string
  kind: 'deadline' | 'renewal' | 'notification'
  severity: 'overdue' | 'today' | 'urgent' | 'notification'
  title: string
  subtitle?: string
  linkUrl: string
  occurredAt: string
  unread?: boolean
  notificationId?: string
}

const CATEGORY_ICON = {
  overdue: AlertTriangle,
  today: CalendarClock,
  urgent: Clock,
  notification: Bell,
} satisfies Record<AlertItem['severity'], typeof AlertTriangle>

function sectionTone(severity: AlertItem['severity']) {
  switch (severity) {
    case 'overdue':
      return {
        border: 'border-destructive/15',
        bg: 'bg-destructive/[0.04]',
        text: 'text-destructive',
        dot: 'bg-destructive',
      }
    case 'today':
      return {
        border: 'border-primary/20',
        bg: 'bg-primary/[0.04]',
        text: 'text-primary',
        dot: 'bg-primary',
      }
    case 'urgent':
      return {
        border: 'border-brand-green/15',
        bg: 'bg-brand-green/[0.03]',
        text: 'text-brand-green',
        dot: 'bg-brand-green',
      }
    case 'notification':
      return {
        border: 'border-brand-green/12',
        bg: 'bg-brand-green/[0.025]',
        text: 'text-brand-green',
        dot: 'bg-primary',
      }
  }
}

const SECTION_KEYS = {
  overdue: 'sections.overdue',
  today: 'sections.today',
  urgent: 'sections.urgent',
  notification: 'sections.notifications',
} as const

const EMPTY_KEYS = {
  overdue: 'empty.overdue',
  today: 'empty.today',
  urgent: 'empty.urgent',
  notification: 'empty.notifications',
} as const

function AlertsList({
  items,
  severity,
  onOpenNotification,
}: {
  items: AlertItem[]
  severity: AlertItem['severity']
  onOpenNotification?: (notificationId: string) => void
}) {
  const { t, i18n } = useTranslation('alerts')
  const Icon = CATEGORY_ICON[severity]
  const tone = sectionTone(severity)

  return (
    <div
      className={cn(
        'space-y-2 rounded-2xl border bg-white/40 p-4 backdrop-blur-sm',
        tone.border,
        tone.bg,
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn('flex items-center gap-2.5', tone.text)}>
          <span className={cn('flex size-8 items-center justify-center rounded-xl border', tone.border, 'bg-white/55')}>
            <Icon className="size-4" />
          </span>
          <h2 className={cn('font-serif text-lg', tone.text)}>
            {t(SECTION_KEYS[severity])}
          </h2>
        </div>
        {items.length > 0 ? (
          <Badge
            variant="secondary"
            className="h-6 border-none bg-white/70 text-brand-green shadow-sm"
          >
            {items.length}
          </Badge>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-sm font-medium text-muted-foreground">{t(EMPTY_KEYS[severity])}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const isNotification = item.kind === 'notification' && item.notificationId
            const link = item.linkUrl || '/dashboard'
            const accent =
              item.kind === 'renewal'
                ? 'ring-primary/20'
                : item.kind === 'deadline'
                  ? 'ring-brand-green/20'
                  : 'ring-primary/15'

            return (
              <li key={item.id} className={cn('group')}>
                <Link
                  to={link}
                  onClick={() => {
                    if (isNotification && item.notificationId) {
                      onOpenNotification?.(item.notificationId)
                    }
                  }}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border bg-white/75 p-3 transition-all duration-300',
                    'hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_8px_24px_rgba(232,98,26,0.08)]',
                    accent,
                  )}
                >
                  <span className="mt-0.5 inline-flex size-2.5 shrink-0 rounded-full bg-primary shadow-[0_0_10px_rgba(232,98,26,0.25)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-foreground">
                      {item.title}
                    </span>
                    {item.subtitle ? (
                      <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                        {item.subtitle}
                      </span>
                    ) : null}
                    <span className="mt-1 block text-[11px] font-bold text-muted-foreground/80">
                      {new Date(item.occurredAt).toLocaleDateString(i18n.language)}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function AlertsPage() {
  const { t } = useTranslation(['alerts', 'common'])
  const markRead = useMarkNotificationRead()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['alerts', 'summary'],
    queryFn: () => apiClient.get<AlertsSummaryResponse>('/alerts/summary'),
    refetchOnMount: false,
    refetchInterval: 60_000,
  })

  const res = data
  const overdue = res?.overdue ?? []
  const today = res?.today ?? []
  const urgent = res?.urgent ?? []
  const notifications = res?.notifications ?? []

  const openNotification = (notificationId: string) => {
    markRead.mutate(notificationId)
  }

  const sections = useMemo(
    () => [
      { severity: 'overdue' as const, items: overdue },
      { severity: 'today' as const, items: today },
      { severity: 'urgent' as const, items: urgent },
      { severity: 'notification' as const, items: notifications },
    ],
    [overdue, today, urgent, notifications],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">{t('page.title', { ns: 'alerts' })}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t('page.description', { ns: 'alerts' })}
          </p>
        </div>
        {isError ? (
          <button
            type="button"
            className="rounded-lg border border-primary/25 bg-white/70 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/[0.05]"
            onClick={() => void refetch()}
          >
            {t('actions.retry', { ns: 'common' })}
          </button>
        ) : null}
      </div>

      <ReportPanel className="p-4 md:p-5">
        {isLoading ? (
          <div className="space-y-3 py-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/40" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {sections.map((s) => (
              <AlertsList
                key={s.severity}
                items={s.items}
                severity={s.severity}
                onOpenNotification={openNotification}
              />
            ))}
          </div>
        )}
      </ReportPanel>

    </div>
  )
}
