import { Badge } from '@/components/ui/badge'
import type { MatterStatus } from '@/features/matters/types'
import { MATTER_STATUS_BADGE_VARIANT, MATTER_STATUS_LABELS } from '@/features/matters/utils'
import { cn } from '@/lib/utils'

type MatterStatusBadgeProps = {
  status: MatterStatus
  className?: string
}

export function MatterStatusBadge({ status, className }: MatterStatusBadgeProps) {
  return (
    <Badge
      variant={MATTER_STATUS_BADGE_VARIANT[status]}
      className={cn('normal-case tracking-normal', className)}
    >
      {MATTER_STATUS_LABELS[status]}
    </Badge>
  )
}
