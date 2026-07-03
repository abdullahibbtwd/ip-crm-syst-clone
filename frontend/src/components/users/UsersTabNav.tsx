import { NavLink } from 'react-router-dom'
import { Building2, UserRound, UsersRound } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/users/team', label: 'Team', icon: UsersRound, description: 'Internal staff' },
  { to: '/users/portal', label: 'Portal users', icon: UserRound, description: 'Client accounts' },
] as const

export function UsersTabNav() {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-border/80 pb-0">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              'group relative -mb-px flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm transition-colors',
              isActive
                ? 'border-border/80 bg-card font-medium text-foreground shadow-sm'
                : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground',
            )
          }
        >
          <tab.icon className="size-4 shrink-0 opacity-80" aria-hidden />
          <span>{tab.label}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">· {tab.description}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function UsersSegmentIcon({ segment }: { segment: 'team' | 'portal' }) {
  const Icon = segment === 'portal' ? Building2 : UsersRound
  return <Icon className="size-4" aria-hidden />
}
