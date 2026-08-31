import type { MatterDetail, MatterStatus } from './types'
import { territoryFromAttrs } from './prosecution-stages'
import { readOppositionEvents } from './opposition-workflow'

export type OppositionStageBadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'outline'

export const OPPOSITION_STAGE_BADGE_VARIANT: Record<
  OppositionStage,
  OppositionStageBadgeVariant
> = {
  disputes_division: 'info',
  opposition_decision: 'warning',
  disputes_department_decision: 'default',
  case: 'destructive',
  stopped: 'secondary',
  closed: 'success',
}

export const OPPOSITION_ARCHIVE_TAG = 'opposition-archive'

export const OPPOSITION_STAGES = [
  'disputes_division',
  'opposition_decision',
  'disputes_department_decision',
  'case',
  'stopped',
  'closed',
] as const

export type OppositionStage = (typeof OPPOSITION_STAGES)[number]

export type OppositionBasisMark = {
  applicationNo?: string
  name?: string
  applicationDate?: string
  classes?: string
  owner?: string
  country?: string
  hasFile?: boolean
  markImageDocumentId?: string
  markImageDocumentVersionId?: string
}

export type OppositionNote = {
  id: string
  createdAt: string
  regarding: string
  details: string
  userName?: string
}

export function isOppositionMatter(
  matter: Pick<MatterDetail, 'matterType' | 'attributes'>,
): boolean {
  if (matter.matterType !== 'trademark') return false
  return matter.attributes?.attributes?.trademarkProcedure === 'opposition'
}

function readNiceClasses(attrs: Record<string, unknown>): string[] {
  if (!Array.isArray(attrs.niceClasses)) return []
  return attrs.niceClasses
    .map((c) => (typeof c === 'number' ? String(c) : String(c)))
    .filter(Boolean)
}

function readBasisMarks(attrs: Record<string, unknown>): OppositionBasisMark[] {
  if (!Array.isArray(attrs.basisMarks)) return []
  return attrs.basisMarks
    .filter((m) => m && typeof m === 'object' && !Array.isArray(m))
    .map((m) => m as OppositionBasisMark)
}

export function readOppositionNotes(attrs: Record<string, unknown>): OppositionNote[] {
  if (!Array.isArray(attrs.oppositionNotes)) return []
  return attrs.oppositionNotes
    .filter((n) => n && typeof n === 'object' && !Array.isArray(n))
    .map((n) => {
      const row = n as Record<string, unknown>
      return {
        id: typeof row.id === 'string' ? row.id : '',
        createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
        regarding: typeof row.regarding === 'string' ? row.regarding : '',
        details: typeof row.details === 'string' ? row.details : '',
        userName: typeof row.userName === 'string' ? row.userName : undefined,
      }
    })
    .filter((n) => n.id)
}

export function readOppositionFields(matter: MatterDetail) {
  const attrs = matter.attributes?.attributes ?? {}
  const prosecution =
    attrs.prosecution &&
    typeof attrs.prosecution === 'object' &&
    !Array.isArray(attrs.prosecution)
      ? (attrs.prosecution as Record<string, unknown>)
      : null

  const stageRaw = attrs.oppositionStage
  const oppositionStage =
    typeof stageRaw === 'string' &&
    (OPPOSITION_STAGES as readonly string[]).includes(stageRaw)
      ? (stageRaw as OppositionStage)
      : null

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
    niceClasses: readNiceClasses(attrs),
    markType: typeof attrs.markType === 'string' ? attrs.markType : null,
    territory: territoryFromAttrs(attrs),
    representative:
      (typeof prosecution?.representatives === 'string' && prosecution.representatives) ||
      (typeof attrs.mol === 'string' && attrs.mol) ||
      '',
    basisMarks: readBasisMarks(attrs),
    againstClasses:
      typeof attrs.againstClasses === 'string' ? attrs.againstClasses : '',
    submittedBy:
      typeof attrs.oppositionFiler === 'string'
        ? attrs.oppositionFiler
        : typeof attrs.requester === 'string'
          ? attrs.requester
          : '',
    oppositionStage,
    statusHistory: Array.isArray(attrs.oppositionStatusHistory)
      ? attrs.oppositionStatusHistory.filter(
          (line): line is string => typeof line === 'string' && line.trim().length > 0,
        )
      : [],
    notes: readOppositionNotes(attrs),
    events: readOppositionEvents(attrs),
  }
}

export function oppositionMarkTypeLabel(
  markType: string | null,
  territory: ReturnType<typeof territoryFromAttrs>,
): string {
  if (territory === 'eu') return 'CTM'
  if (!markType) return '—'
  return markType.replace(/_/g, ' ')
}

export function isOppositionStage(value: string | null | undefined): value is OppositionStage {
  return Boolean(value && (OPPOSITION_STAGES as readonly string[]).includes(value))
}

export function oppositionStageBadgeVariant(
  stage: string | null | undefined,
  matterStatus?: MatterStatus,
): OppositionStageBadgeVariant {
  if (stage && isOppositionStage(stage)) {
    return OPPOSITION_STAGE_BADGE_VARIANT[stage]
  }
  if (matterStatus === 'closed') return 'success'
  if (matterStatus === 'on_hold') return 'secondary'
  if (matterStatus === 'draft') return 'secondary'
  return 'outline'
}

/** Maps terminal opposition stages to matter lifecycle status. */
export function matterStatusForOppositionStage(
  stage: OppositionStage | null | undefined,
): MatterStatus | undefined {
  if (stage === 'closed') return 'closed'
  if (stage === 'stopped') return 'on_hold'
  return undefined
}

export function appendOppositionStatusHistory(
  existing: string[],
  entry: { stageLabel: string; userName: string; at?: Date },
): string[] {
  const at = entry.at ?? new Date()
  const stamp = at.toLocaleString()
  const line = `${stamp} — ${entry.userName} — ${entry.stageLabel}`
  return [...existing, line]
}

export function formatBasisMarkCountry(code: string | undefined): string {
  if (!code?.trim()) return '—'
  return code.trim()
}
