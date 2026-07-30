import type { Jurisdiction, JurisdictionOption } from './types'

/** Legacy priority labels used as sync fallback before/without API data. */
export const FALLBACK_JURISDICTION_OPTIONS: JurisdictionOption[] = [
  { value: 'BG', label: 'BPO — Bulgaria (BG)' },
  { value: 'EU', label: 'EUIPO — European Union (EU)' },
  { value: 'EP', label: 'EPO — European Patent (EP)' },
  { value: 'WO', label: 'WIPO — WIPO / PCT (WO)' },
]

export function formatJurisdictionLabel(
  j: Pick<Jurisdiction, 'officeName' | 'name' | 'code'>,
): string {
  return `${j.officeName} — ${j.name} (${j.code})`
}

export function toJurisdictionOptions(
  jurisdictions: Array<Pick<Jurisdiction, 'officeName' | 'name' | 'code'>>,
): JurisdictionOption[] {
  return jurisdictions.map((j) => ({
    value: j.code,
    label: formatJurisdictionLabel(j),
  }))
}

export function resolveJurisdictionLabel(
  code: string | null | undefined,
  jurisdictions?: Array<Pick<Jurisdiction, 'officeName' | 'name' | 'code'>>,
): string {
  if (!code) return '-'
  const fromList = jurisdictions?.find((j) => j.code === code)
  if (fromList) return formatJurisdictionLabel(fromList)
  const fallback = FALLBACK_JURISDICTION_OPTIONS.find((o) => o.value === code)
  return fallback?.label ?? code
}
