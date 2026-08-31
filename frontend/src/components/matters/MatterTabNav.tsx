import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { matterTabsForUser } from '@/config/matter-tabs'
import { useMatterTabCounts } from '@/features/matters/hooks/useMatters'
import {
  MATTER_TAB_BADGE_CLASS,
  matterTabBadge,
} from '@/components/matters/matter-tab-badge'
import { cn } from '@/lib/utils'

type MatterTabNavProps = {
  matterId: string
  isPortalClient?: boolean
  matterType?: string | null
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
        const badge = matterTabBadge(countKey, counts)
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
                      'inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums',
                      badge.tone === 'default'
                        ? isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted-foreground/25 text-foreground shadow-sm'
                        : MATTER_TAB_BADGE_CLASS[badge.tone],
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
