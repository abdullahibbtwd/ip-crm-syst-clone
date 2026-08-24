import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { MatterTabCountKey } from '@/config/matter-tabs'
import { matterTabsForUser } from '@/config/matter-tabs'
import { useMatterTabCounts } from '@/features/matters/hooks/useMatters'
import type { MatterTabCounts } from '@/features/matters/types'
import { cn } from '@/lib/utils'

type MatterTabNavProps = {
  matterId: string
  isPortalClient?: boolean
  matterType?: string | null
}

type TabBadge = {
  count: number
  tone: 'default' | 'warning' | 'new'
}

function tabBadge(
  countKey: MatterTabCountKey | undefined,
  counts: MatterTabCounts | undefined,
): TabBadge {
  if (!countKey || !counts) return { count: 0, tone: 'default' }

  if (countKey === 'deadlines') {
    return {
      count: counts.deadlines,
      tone: counts.deadlinesOverdue > 0 ? 'warning' : 'default',
    }
  }

  if (countKey === 'correspondence') {
    if (counts.correspondenceNew > 0) {
      return { count: counts.correspondenceNew, tone: 'new' }
    }
    return { count: counts.correspondence, tone: 'default' }
  }

  return { count: counts[countKey], tone: 'default' }
}

export function MatterTabNav({
  matterId,
  isPortalClient = false,
  matterType,
}: MatterTabNavProps) {
  const { t } = useTranslation('matters')
  const base = `/matters/${matterId}`
  const tabs = matterTabsForUser(isPortalClient, matterType)
  const { data: counts } = useMatterTabCounts(matterId)

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b pb-2 scrollbar-thin">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const countKey = 'countKey' in tab ? tab.countKey : undefined
        const badge = tabBadge(countKey, counts)
        const countLabel = badge.count > 99 ? '99+' : String(badge.count)

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
                {badge.count > 0 ? (
                  <span
                    className={cn(
                      'inline-flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
                      badge.tone === 'warning' && 'bg-destructive text-white',
                      badge.tone === 'new' && 'bg-primary text-primary-foreground',
                      badge.tone === 'default' &&
                        (isActive
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted-foreground/15 text-muted-foreground'),
                    )}
                    aria-label={t('tabs.countAria', {
                      count: badge.count,
                      tab: t(tab.labelKey),
                    })}
                  >
                    {countLabel}
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
