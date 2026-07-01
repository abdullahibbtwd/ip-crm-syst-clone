import type { NavItem } from '@/config/role-views'
import { ComingSoon } from './ComingSoon'

type SectionPanelProps = {
  item: NavItem
}

export function SectionPanel({ item }: SectionPanelProps) {
  const Icon = item.icon

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          <Icon className="size-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-foreground">{item.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This section is not available yet.
          </p>
        </div>
      </div>

      <ComingSoon title={`${item.label} - coming soon`} />
    </div>
  )
}
