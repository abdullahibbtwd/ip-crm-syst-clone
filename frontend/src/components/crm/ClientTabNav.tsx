import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { to: 'overview', label: 'Overview' },
  { to: 'offices', label: 'Offices' },
  { to: 'contacts', label: 'Contacts' },
  { to: 'related', label: 'Related' },
  { to: 'history', label: 'History' },
  { to: 'matters', label: 'Matters' },
  { to: 'billing', label: 'Billing' },
] as const

export function ClientTabNav({ clientId }: { clientId: string }) {
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
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
