import type { TFunction } from 'i18next'
import type { MatterStatus } from './types'

type ProcedureStageListKey =
  | 'oppositionList'
  | 'cancellationList'
  | 'deletionList'

type MattersTFunction = TFunction<'matters'>

export function trademarkProcedureStageLabel(
  t: MattersTFunction,
  listKey: ProcedureStageListKey,
  stage: string | null | undefined,
  matterStatus?: MatterStatus,
): string {
  if (stage) {
    return t(`${listKey}.stages.${stage}`, {
      defaultValue: stage.replace(/_/g, ' '),
    })
  }
  if (matterStatus === 'draft') return t('status.draft')
  return t(`${listKey}.stageNone`)
}

export function trademarkProcedureStageSelectLabel(
  t: MattersTFunction,
  listKey: ProcedureStageListKey,
  stage: string | null | undefined,
): string {
  if (!stage || stage === 'none') return t(`${listKey}.stageNone`)
  return trademarkProcedureStageLabel(t, listKey, stage)
}
