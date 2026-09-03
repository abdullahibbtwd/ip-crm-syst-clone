import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/AuthProvider'
import { useClientTabCounts } from '@/features/crm/hooks/useClients'
import { clientTabsForUser, formatTabCount } from '@/config/client-tabs'
import { canViewGdprCompliance } from '@/lib/rbac'
import { cn } from '@/lib/utils'

export function ClientTabNav({ clientId }: { clientId: string }) {
  const { t } = useTranslation('crm')
  const { user } = useAuth()
  const showCompliance = canViewGdprCompliance(user?.roles ?? [])
  const tabs = clientTabsForUser(showCompliance)
  const { data: counts } = useClientTabCounts(clientId)
  const base = `/clients/${clientId}`

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b pb-2 scrollbar-thin">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const count = tab.countKey ? (counts?.[tab.countKey] ?? 0) : 0
        const deadlineCount = tab.to === 'notes' ? (counts?.deadlines ?? 0) : 0

        return (
          <NavLink
            key={tab.to}
            to={`${base}/${tab.to}`}
            end={tab.to === 'overview'}
            className={({ isActive }) =>
              cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-primary/12 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                <span>{t(tab.labelKey)}</span>
                {count > 0 ? (
                  <span
                    className={cn(
                      'inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted-foreground/25 text-foreground shadow-sm',
                    )}
                    aria-label={t('tabs.countAria', {
                      count,
                      tab: t(tab.labelKey),
                    })}
                  >
                    {formatTabCount(count)}
                  </span>
                ) : null}
                {deadlineCount > 0 ? (
                  <span
                    className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-white tabular-nums shadow-sm"
                    aria-label={t('clientNotes.deadlinesCountAria', {
                      count: deadlineCount,
                    })}
                  >
                    {formatTabCount(deadlineCount)}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
