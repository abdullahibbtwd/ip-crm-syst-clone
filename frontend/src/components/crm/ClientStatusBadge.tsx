import { Badge } from '@/components/ui/badge'
import type { ClientStatus } from '@/features/crm/types'
import { CLIENT_STATUS_BADGE_VARIANT, clientStatusLabel } from '@/features/crm/utils'
import { cn } from '@/lib/utils'

type ClientStatusBadgeProps = {
  status: ClientStatus
  className?: string
}

export function ClientStatusBadge({ status, className }: ClientStatusBadgeProps) {
  return (
    <Badge
      variant={CLIENT_STATUS_BADGE_VARIANT[status]}
      className={cn('normal-case tracking-normal', className)}
    >
      {clientStatusLabel(status)}
    </Badge>
  )
}
