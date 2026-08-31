import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { TFunction } from 'i18next'
import {
  isOppositionStage,
  oppositionStageBadgeVariant,
} from '@/features/matters/opposition-matter'
import type { MatterStatus } from '@/features/matters/types'
import { trademarkProcedureStageLabel } from '@/features/matters/trademark-procedure-stage-label'
import { cn } from '@/lib/utils'

type OppositionStageBadgeProps = {
  stage: string | null | undefined
  matterStatus?: MatterStatus
  className?: string
}

export function oppositionStageLabel(
  t: TFunction<'matters'>,
  stage: string | null | undefined,
  matterStatus: MatterStatus,
): string {
  if (stage && isOppositionStage(stage)) {
    return trademarkProcedureStageLabel(t, 'oppositionList', stage, matterStatus)
  }
  if (matterStatus === 'closed') return t('oppositionList.stages.closed')
  return trademarkProcedureStageLabel(t, 'oppositionList', stage, matterStatus)
}

export function OppositionStageBadge({
  stage,
  matterStatus = 'active',
  className,
}: OppositionStageBadgeProps) {
  const { t } = useTranslation('matters')
  const label = oppositionStageLabel(t, stage, matterStatus)
  const variant = oppositionStageBadgeVariant(stage, matterStatus)

  return (
    <Badge
      variant={variant}
      className={cn('normal-case font-medium tracking-normal', className)}
    >
      {label}
    </Badge>
  )
}
