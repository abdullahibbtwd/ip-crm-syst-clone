import i18n from '@/i18n'
import type { PatentListSummary } from './types'
import { getCountryLabel } from '@/lib/countries'

export function patentTerritoryLabel(
  territoryCode: PatentListSummary['territoryCode'],
): string {
  if (!territoryCode) return '—'
  if (territoryCode === 'EP') {
    return i18n.t('patentList.territoryEp', { ns: 'matters', defaultValue: 'EP' })
  }
  return getCountryLabel(territoryCode) ?? territoryCode
}

export function patentProcedureLabel(
  procedure: PatentListSummary['patentProcedure'],
): string {
  if (!procedure) return '—'
  return i18n.t(`createFile.patentFilingRoutes.${procedure}`, {
    ns: 'matters',
    defaultValue: procedure,
  })
}

export function patentProsecutionStageLabel(
  stage: PatentListSummary['prosecutionStage'],
  patentProcedure: PatentListSummary['patentProcedure'],
): string {
  if (!stage) return '—'
  if (patentProcedure === 'ep_validation') {
    return i18n.t(`prosecution.patentStages.ep_validation.${stage}`, {
      ns: 'matters',
      defaultValue: stage.replace(/_/g, ' '),
    })
  }
  return i18n.t(`prosecution.stages.${stage}`, {
    ns: 'matters',
    defaultValue: stage.replace(/_/g, ' '),
  })
}

export function formatPatentRefDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatPatentClaims(summary: PatentListSummary | null | undefined): string {
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
  const formattedDate = date ? formatPatentRefDate(date) : null
  return {
    primary: number ?? '—',
    secondary: formattedDate,
  }
}
