import { NavLink } from 'react-router-dom'
import { Eye, Folder, NotebookPen, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ProcedureNavTab = {
  to: string
  end?: boolean
  label: string
  icon: LucideIcon
  badge?: number
}

type TrademarkProcedureMatterNavProps = {
  tabs: ProcedureNavTab[]
}

export function TrademarkProcedureMatterNav({ tabs }: TrademarkProcedureMatterNavProps) {
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b pb-2 scrollbar-thin">
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-primary/12 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
            <span>{tab.label}</span>
            {tab.badge != null && tab.badge > 0 ? (
              <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-muted-foreground/25 px-1.5 text-xs font-bold tabular-nums text-foreground">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            ) : null}
          </NavLink>
        )
      })}
    </nav>
  )
}

export { Eye, Folder, NotebookPen }
