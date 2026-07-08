import { CalendarClock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type DueTodayBadgeProps = {
  className?: string
  size?: 'sm' | 'md'
}

export function DueTodayBadge({ className, size = 'sm' }: DueTodayBadgeProps) {
  return (
    <Badge
      variant="warning"
      className={cn(
        'gap-1 normal-case shadow-sm',
        size === 'sm' ? 'text-[10px]' : 'text-xs',
        className,
      )}
    >
      <CalendarClock className="size-3" aria-hidden />
      Due today
    </Badge>
  )
}

export function DueTodayCountBadge({
  count,
  collapsed,
  external,
  label = 'due today',
  tone = 'warning',
}: {
  count: number
  collapsed?: boolean
  external?: boolean
  label?: string
  tone?: 'warning' | 'success'
}) {
  if (count <= 0) return null

  const countLabel = count > 9 ? '9+' : String(count)
  const toneBg = tone === 'success' ? (external ? 'bg-emerald-400' : 'bg-brand-green/90') : null
  const warningBg = external ? 'bg-orange-400' : 'bg-orange-500'
  const badgeBg = tone === 'success' ? toneBg : warningBg

  if (collapsed) {
    return (
      <span
        className={cn(
          'absolute -top-0.5 -right-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white shadow-sm',
          badgeBg,
        )}
        aria-label={`${count} ${label}`}
      >
        {countLabel}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'ml-auto flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums text-white shadow-sm',
        badgeBg,
      )}
      aria-label={`${count} ${label}`}
    >
      {countLabel}
    </span>
  )
}
