import i18n from '@/i18n'
import type { DesignListSummary } from './types'
import { getCountryLabel } from '@/lib/countries'

export function designTerritoryLabel(
  territoryCode: DesignListSummary['territoryCode'],
): string {
  if (!territoryCode) return '—'
  if (territoryCode === 'EU') {
    return i18n.t('designList.territoryEu', { ns: 'matters', defaultValue: 'EU' })
  }
  if (territoryCode === 'WO') {
    return i18n.t('designList.territoryWipo', { ns: 'matters', defaultValue: 'WIPO' })
  }
  return getCountryLabel(territoryCode) ?? territoryCode
}

export function designStatusLabel(summary: DesignListSummary | null | undefined): string {
  if (!summary) return '—'
  if (summary.isRegistered) {
    return i18n.t('designList.status.registered', {
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

export function formatDesignRefDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatLocarnoClassification(
  summary: DesignListSummary | null | undefined,
): string {
  if (!summary) return '—'
  const raw = summary.classification?.trim()
  if (raw) return raw.endsWith(',') ? raw : `${raw},`
  const parts = [summary.locarnoClass, summary.locarnoSubclass].filter(Boolean)
  if (parts.length === 0) return '—'
  const joined = parts.length === 2 ? `${parts[0]}-${parts[1]}` : parts[0]
  return `${joined},`
}

export function formatRefNumberDate(
  number: string | null | undefined,
  date: string | null | undefined,
): { primary: string; secondary: string | null } {
  if (!number && !date) {
    return { primary: '—', secondary: null }
  }
  const formattedDate = date ? formatDesignRefDate(date) : null
  return {
    primary: number ?? '—',
    secondary: formattedDate,
  }
}
