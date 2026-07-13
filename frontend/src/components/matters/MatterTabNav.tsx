import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { matterTabsForUser } from '@/config/matter-tabs'
import { cn } from '@/lib/utils'

type MatterTabNavProps = {
  matterId: string
  isPortalClient?: boolean
}

export function MatterTabNav({ matterId, isPortalClient = false }: MatterTabNavProps) {
  const { t } = useTranslation('matters')
  const base = `/matters/${matterId}`
  const tabs = matterTabsForUser(isPortalClient)

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b pb-2 scrollbar-thin">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={`${base}/${tab.to}`}
          end={tab.to === 'overview'}
          className={({ isActive }) =>
            cn(
              'shrink-0 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
              isActive
                ? 'bg-primary/12 font-medium text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          {t(tab.labelKey)}
        </NavLink>
      ))}
    </nav>
  )
}
