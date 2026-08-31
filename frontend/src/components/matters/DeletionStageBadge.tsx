import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { TFunction } from 'i18next'
import {
  DELETION_STAGE_BADGE_VARIANT,
  deletionStageBadgeVariant,
} from '@/features/matters/deletion-matter'
import type { MatterStatus } from '@/features/matters/types'
import { trademarkProcedureStageLabel } from '@/features/matters/trademark-procedure-stage-label'

type DeletionStageBadgeProps = {
  stage: string | null | undefined
  matterStatus?: MatterStatus
  className?: string
}

export function deletionStageLabel(
  t: TFunction<'matters'>,
  stage: string | null | undefined,
  matterStatus?: MatterStatus,
): string {
  return trademarkProcedureStageLabel(t, 'deletionList', stage, matterStatus)
}

export function DeletionStageBadge({
  stage,
  matterStatus,
  className,
}: DeletionStageBadgeProps) {
  const { t } = useTranslation('matters')
  const label = deletionStageLabel(t, stage, matterStatus)
  const variant = deletionStageBadgeVariant(stage, matterStatus)

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}

export { DELETION_STAGE_BADGE_VARIANT }
