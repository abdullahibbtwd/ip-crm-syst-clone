import i18n from '@/i18n'
import type { GiListSummary } from './types'
import { getCountryLabel } from '@/lib/countries'

export function giTerritoryLabel(
  territoryCode: GiListSummary['territoryCode'],
): string {
  if (!territoryCode) return '—'
  if (territoryCode === 'EU') {
    return i18n.t('giList.territoryEu', { ns: 'matters', defaultValue: 'EU' })
  }
  if (territoryCode === 'WO') {
    return i18n.t('giList.territoryWipo', { ns: 'matters', defaultValue: 'WIPO' })
  }
  return getCountryLabel(territoryCode) ?? territoryCode
}

export function giStatusLabel(summary: GiListSummary | null | undefined): string {
  if (!summary) return '—'
  if (summary.isRegistered) {
    return i18n.t('giList.status.registered', {
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

export function formatGiRefDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatGiClassification(
  summary: GiListSummary | null | undefined,
): string {
  if (!summary?.classification?.trim()) return '—'
  return summary.classification.trim()
}

export function formatRefNumberDate(
  number: string | null | undefined,
  date: string | null | undefined,
): { primary: string; secondary: string | null } {
  if (!number && !date) {
    return { primary: '—', secondary: null }
  }
  const formattedDate = date ? formatGiRefDate(date) : null
  return {
    primary: number ?? '—',
    secondary: formattedDate,
  }
}

export function readGiGoodsClassification(attrs: Record<string, unknown>): string {
  const goods = attrs.goodsAndServices
  if (Array.isArray(goods)) {
    const parts = goods
      .map((row) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return null
        const number = typeof row.number === 'string' ? row.number.trim() : ''
        return number ? `${number},` : null
      })
      .filter((c): c is string => Boolean(c))
    if (parts.length > 0) return parts.join(' ')
  }
  const summary = typeof attrs.goodsSummary === 'string' ? attrs.goodsSummary.trim() : ''
  if (summary) return summary.split('\n')[0]?.trim() || '—'
  return '—'
}
