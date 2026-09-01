import i18n from '@/i18n'
import type { CaseListSummary } from './types'

export function formatCaseParties(summary: CaseListSummary | null | undefined): {
  client: string
  opposing: string
} {
  if (!summary) return { client: '—', opposing: '—' }
  return {
    client: summary.clientName ?? '—',
    opposing: summary.opposingPartyName ?? '—',
  }
}

export function formatCaseNumber(summary: CaseListSummary | null | undefined): string {
  if (!summary?.caseNumber) return '—'
  if (summary.isIncoming) {
    return `${summary.caseNumber} (${i18n.t('caseList.incomingSuffix', {
      ns: 'matters',
      defaultValue: 'incoming',
    })})`
  }
  return summary.caseNumber
}

export function formatCaseCourt(summary: CaseListSummary | null | undefined): string {
  return summary?.courtLabel?.trim() || '—'
}

export function formatCaseStatus(summary: CaseListSummary | null | undefined): string {
  if (!summary?.statusLabel) return '—'
  const key = `caseList.statusOptions.${summary.statusLabel}`
  const translated = i18n.t(key, { ns: 'matters', defaultValue: '' })
  if (translated) return translated
  return summary.statusLabel.replace(/_/g, ' ')
}

export function formatCaseRefDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}
