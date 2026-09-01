import i18n from '@/i18n'
import type { UtilityModelListSummary } from './types'
import { getCountryLabel } from '@/lib/countries'

export function utilityModelTerritoryLabel(
  territoryCode: UtilityModelListSummary['territoryCode'],
): string {
  if (!territoryCode) return '—'
  if (territoryCode === 'WO') {
    return i18n.t('utilityModelList.territoryWipo', { ns: 'matters', defaultValue: 'WIPO' })
  }
  return getCountryLabel(territoryCode) ?? territoryCode
}

export function utilityModelStatusLabel(
  summary: UtilityModelListSummary | null | undefined,
): string {
  if (!summary) return '—'
  if (summary.isRegistered) {
    return i18n.t('utilityModelList.status.registered', {
      ns: 'matters',
      defaultValue: 'Registered',
    })
  }
  const stage = summary.prosecutionStage
  if (!stage) return '—'
  return i18n.t(`prosecution.stages.${stage}`, {
    ns: 'matters',
    defaultValue: stage.replace(/_/g, ' '),
  })
}

export function formatUtilityModelRefDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatUtilityModelClaims(
  summary: UtilityModelListSummary | null | undefined,
): string {
  if (!summary) return '—'
  if (summary.claimsSummary?.trim()) return summary.claimsSummary.trim()
  if (summary.ipcClasses.length > 0) return summary.ipcClasses.join(', ')
  return '—'
}

export function formatRefNumberDate(
  number: string | null | undefined,
  date: string | null | undefined,
): { primary: string; secondary: string | null } {
  if (!number && !date) {
    return { primary: '—', secondary: null }
  }
  const formattedDate = date ? formatUtilityModelRefDate(date) : null
  return {
    primary: number ?? '—',
    secondary: formattedDate,
  }
}
