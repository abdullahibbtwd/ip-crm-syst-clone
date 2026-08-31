import i18n from '@/i18n'
import type { TrademarkListSummary } from './types'
import { markTypeLabel } from './utils'

export function trademarkTerritoryLabel(
  territory: TrademarkListSummary['territory'],
): string {
  if (!territory) return '—'
  return i18n.t(`createFile.territories.${territory}`, { ns: 'matters' })
}

export function prosecutionStageLabel(
  stage: TrademarkListSummary['prosecutionStage'],
): string {
  if (!stage) return '—'
  return i18n.t(`prosecution.stages.${stage}`, {
    ns: 'matters',
    defaultValue: stage.replace(/_/g, ' '),
  })
}

export function trademarkMarkTypeLabel(markType: string | null | undefined): string {
  if (!markType) return '—'
  return markTypeLabel(markType)
}

export function formatTrademarkRefDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatNiceClasses(classes: string[]): string {
  if (classes.length === 0) return '—'
  return classes.join(', ')
}

export function formatRefNumberDate(
  number: string | null | undefined,
  date: string | null | undefined,
): { primary: string; secondary: string | null } {
  if (!number && !date) {
    return { primary: '—', secondary: null }
  }
  const formattedDate = date ? formatTrademarkRefDate(date) : null
  return {
    primary: number ?? '—',
    secondary: formattedDate,
  }
}
