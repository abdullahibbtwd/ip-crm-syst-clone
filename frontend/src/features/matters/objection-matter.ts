import type { MatterDetail } from './types'
import { territoryFromAttrs } from './prosecution-stages'
import { markTypeLabel } from './utils'

export const OBJECTION_ARCHIVE_TAG = 'objection-archive'

export type ObjectionFiling = {
  submissionDate?: string
  incomingNumber?: string
  poaIncomingNumber?: string
  poaDate?: string
}

export function isObjectionMatter(
  matter: Pick<MatterDetail, 'matterType' | 'attributes'>,
): boolean {
  if (matter.matterType !== 'trademark') return false
  const attrs = matter.attributes?.attributes ?? {}
  return attrs.trademarkProcedure === 'objection'
}

function readObjectionFiling(attrs: Record<string, unknown>): ObjectionFiling {
  const raw = attrs.objectionFiling
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const filing = raw as Record<string, unknown>
  return {
    submissionDate:
      typeof filing.submissionDate === 'string' ? filing.submissionDate : undefined,
    incomingNumber:
      typeof filing.incomingNumber === 'string' ? filing.incomingNumber : undefined,
    poaIncomingNumber:
      typeof filing.poaIncomingNumber === 'string'
        ? filing.poaIncomingNumber
        : undefined,
    poaDate: typeof filing.poaDate === 'string' ? filing.poaDate : undefined,
  }
}

export function readObjectionFields(matter: MatterDetail) {
  const attrs = matter.attributes?.attributes ?? {}
  const filing = readObjectionFiling(attrs)
  const prosecution =
    attrs.prosecution &&
    typeof attrs.prosecution === 'object' &&
    !Array.isArray(attrs.prosecution)
      ? (attrs.prosecution as Record<string, unknown>)
      : null

  const niceClasses = Array.isArray(attrs.niceClasses)
    ? attrs.niceClasses
        .map((c) => (typeof c === 'number' ? String(c) : String(c)))
        .filter(Boolean)
    : []

  const applicantLegalName =
    typeof attrs.applicantLegalName === 'string' ? attrs.applicantLegalName.trim() : ''

  return {
    markName: matter.title,
    applicationNumber:
      (typeof attrs.applicationNumber === 'string' && attrs.applicationNumber) ||
      (typeof prosecution?.applicationNumber === 'string'
        ? prosecution.applicationNumber
        : '') ||
      '',
    applicationDate:
      (typeof attrs.applicationDate === 'string' && attrs.applicationDate) ||
      (typeof prosecution?.applicationDate === 'string'
        ? prosecution.applicationDate
        : '') ||
      '',
    niceClasses,
    markType: typeof attrs.markType === 'string' ? attrs.markType : null,
    territory: territoryFromAttrs(attrs),
    grounds: typeof attrs.grounds === 'string' ? attrs.grounds : '',
    submissionDate: filing.submissionDate ?? '',
    incomingNumber:
      filing.incomingNumber ??
      (typeof attrs.incomingNumber === 'string' ? attrs.incomingNumber : '') ??
      '',
    poaIncomingNumber:
      filing.poaIncomingNumber ??
      (typeof prosecution?.poaIncomingNumber === 'string'
        ? prosecution.poaIncomingNumber
        : '') ??
      '',
    poaDate:
      filing.poaDate ??
      (typeof prosecution?.poaDate === 'string' ? prosecution.poaDate : '') ??
      '',
    applicantLegalName,
  }
}

export function objectionMarkTypeLabel(
  markType: string | null,
  territory: ReturnType<typeof territoryFromAttrs>,
): string {
  if (territory === 'eu') return 'CTM'
  if (!markType) return '—'
  return markTypeLabel(markType)
}

export function buildObjectionFilingPatch(filing: ObjectionFiling): Record<string, unknown> {
  return {
    objectionFiling: {
      submissionDate: filing.submissionDate?.trim() || undefined,
      incomingNumber: filing.incomingNumber?.trim() || undefined,
      poaIncomingNumber: filing.poaIncomingNumber?.trim() || undefined,
      poaDate: filing.poaDate?.trim() || undefined,
    },
  }
}
