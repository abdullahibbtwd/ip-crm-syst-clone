import i18n from '@/i18n'
import type { OtherListSummary } from './types'
import { formatOtherWorkflowStage } from './other-matter-fields'
import type { MatterType } from './types'

export function formatOtherHeadline(
  summary: OtherListSummary | null | undefined,
  fallbackTitle: string,
): string {
  return summary?.headline?.trim() || fallbackTitle || '—'
}

export function formatOtherIncomingRef(summary: OtherListSummary | null | undefined): string {
  if (!summary?.incomingNumber) return '—'
  if (summary.incomingDate) {
    return `${summary.incomingNumber} · ${formatOtherRefDate(summary.incomingDate)}`
  }
  return summary.incomingNumber
}

export function formatOtherRefDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatOtherWorkflow(
  matterType: MatterType,
  summary: OtherListSummary | null | undefined,
): string {
  if (!summary?.workflowStage) return '—'
  return formatOtherWorkflowStage(matterType, summary.workflowStage)
}

export function formatOtherDeadline(summary: OtherListSummary | null | undefined): string {
  if (!summary?.deadlineHint) return '—'
  return formatOtherRefDate(summary.deadlineHint)
}

export function formatOtherAuthority(summary: OtherListSummary | null | undefined): string {
  return summary?.authorityOffice?.trim() || '—'
}

export function matterTypeLabelShort(type: MatterType): string {
  return i18n.t(`type.${type}`, { ns: 'matters' })
}
