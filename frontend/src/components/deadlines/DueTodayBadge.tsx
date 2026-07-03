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
}: {
  count: number
  collapsed?: boolean
  external?: boolean
}) {
  if (count <= 0) return null

  const label = count > 9 ? '9+' : String(count)

  if (collapsed) {
    return (
      <span
        className={cn(
          'absolute -top-0.5 -right-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white shadow-sm',
          external ? 'bg-orange-400' : 'bg-orange-500',
        )}
        aria-label={`${count} due today`}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'ml-auto flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums text-white shadow-sm',
        external ? 'bg-orange-400' : 'bg-orange-500',
      )}
      aria-label={`${count} due today`}
    >
      {label}
    </span>
  )
}
