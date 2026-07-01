import { Badge } from '@/components/ui/badge'
import type { IntakeStatus } from '@/features/intake/types'
import { INTAKE_STATUS_BADGE_VARIANT, INTAKE_STATUS_LABELS } from '@/features/intake/utils'
import { cn } from '@/lib/utils'

type IntakeStatusBadgeProps = {
  status: IntakeStatus
  className?: string
}

export function IntakeStatusBadge({ status, className }: IntakeStatusBadgeProps) {
  return (
    <Badge
      variant={INTAKE_STATUS_BADGE_VARIANT[status]}
      className={cn('normal-case tracking-normal', className)}
    >
      {INTAKE_STATUS_LABELS[status]}
    </Badge>
  )
}
