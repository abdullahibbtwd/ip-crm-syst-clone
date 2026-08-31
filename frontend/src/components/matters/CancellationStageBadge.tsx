import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { TFunction } from 'i18next'
import {
  CANCELLATION_STAGE_BADGE_VARIANT,
  cancellationStageBadgeVariant,
} from '@/features/matters/cancellation-matter'
import type { MatterStatus } from '@/features/matters/types'
import { trademarkProcedureStageLabel } from '@/features/matters/trademark-procedure-stage-label'

type CancellationStageBadgeProps = {
  stage: string | null | undefined
  matterStatus?: MatterStatus
  className?: string
}

export function cancellationStageLabel(
  t: TFunction<'matters'>,
  stage: string | null | undefined,
  matterStatus?: MatterStatus,
): string {
  return trademarkProcedureStageLabel(t, 'cancellationList', stage, matterStatus)
}

export function CancellationStageBadge({
  stage,
  matterStatus,
  className,
}: CancellationStageBadgeProps) {
  const { t } = useTranslation('matters')
  const label = cancellationStageLabel(t, stage, matterStatus)
  const variant = cancellationStageBadgeVariant(stage, matterStatus)

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}

export { CANCELLATION_STAGE_BADGE_VARIANT }
