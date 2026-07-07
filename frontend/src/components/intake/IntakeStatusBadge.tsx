import { Badge } from '@/components/ui/badge'
import type { IntakeLead } from '@/features/intake/types'
import { INTAKE_STATUS_BADGE_VARIANT, intakeStatusLabel } from '@/features/intake/utils'
import { cn } from '@/lib/utils'

type IntakeStatusBadgeProps = {
  status: IntakeLead['status']
  className?: string
}

export function IntakeStatusBadge({ status, className }: IntakeStatusBadgeProps) {
  return (
    <Badge
      variant={INTAKE_STATUS_BADGE_VARIANT[status]}
      className={cn('normal-case tracking-normal', className)}
    >
      {intakeStatusLabel(status)}
    </Badge>
  )
}
