import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { to: 'overview', label: 'Overview' },
  { to: 'timeline', label: 'Timeline' },
  { to: 'documents', label: 'Documents' },
  { to: 'correspondence', label: 'Correspondence' },
  { to: 'deadlines', label: 'Deadlines' },
  { to: 'tasks', label: 'Tasks' },
  { to: 'billing', label: 'Billing' },
  { to: 'ip-rights', label: 'IP rights' },
] as const

export function MatterTabNav({ matterId }: { matterId: string }) {
  const base = `/matters/${matterId}`

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
