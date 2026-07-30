import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewGdprCompliance } from '@/lib/rbac'
import { cn } from '@/lib/utils'

const baseTabs = [
  { to: 'overview', labelKey: 'tabs.overview' },
  { to: 'offices', labelKey: 'tabs.offices' },
  { to: 'contacts', labelKey: 'tabs.contacts' },
  { to: 'related', labelKey: 'tabs.related' },
  { to: 'history', labelKey: 'tabs.history' },
  { to: 'matters', labelKey: 'tabs.matters' },
  { to: 'documents', labelKey: 'tabs.documents' },
  { to: 'correspondence', labelKey: 'tabs.correspondence' },
  { to: 'watch', labelKey: 'tabs.watch' },
  { to: 'billing', labelKey: 'tabs.billing' },
] as const

const complianceTab = { to: 'access', labelKey: 'tabs.accessHistory' } as const

export function ClientTabNav({ clientId }: { clientId: string }) {
  const { t } = useTranslation('crm')
  const { user } = useAuth()
  const showCompliance = canViewGdprCompliance(user?.roles ?? [])
  const tabs = showCompliance ? [...baseTabs, complianceTab] : baseTabs
  const base = `/clients/${clientId}`

  return (
    <nav className="flex flex-wrap gap-1 border-b pb-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={`${base}/${tab.to}`}
          end={tab.to === 'overview'}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
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
