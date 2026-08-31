import type { MatterDetail, MatterStatus } from './types'
import { territoryFromAttrs } from './prosecution-stages'
import { readDeletionEvents } from './deletion-workflow'

export const DELETION_ARCHIVE_TAG = 'deletion-archive'

export const DELETION_STAGES = [
  'waiting_for_login',
  'in_correspondence',
  'decision',
  'case',
  'stopped',
  'closed',
] as const

export type DeletionStage = (typeof DELETION_STAGES)[number]

export type DeletionAppealStatus = 'not_appealed' | 'appealed'

export type DeletionStageBadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'outline'

export const DELETION_STAGE_BADGE_VARIANT: Record<
  DeletionStage,
  DeletionStageBadgeVariant
> = {
  waiting_for_login: 'warning',
  in_correspondence: 'info',
  decision: 'default',
  case: 'destructive',
  stopped: 'secondary',
  closed: 'success',
}

export type DeletionDeadline = {
  id: string
  date: string
  deadline: string
  regarding: string
  details?: string
}

export type DeletionNote = {
  id: string
  createdAt: string
  regarding: string
  details: string
  userName?: string
}

export type DeletionFee = {
  amount?: string
  paidDate?: string
  documentId?: string
}

export type DeletionPoa = {
  number?: string
  date?: string
  documentId?: string
}

export function isDeletionMatter(
  matter: Pick<MatterDetail, 'matterType' | 'attributes'>,
): boolean {
  if (matter.matterType !== 'trademark') return false
  const procedure = matter.attributes?.attributes?.trademarkProcedure
  return procedure === 'deletion' || procedure === 'revocation'
}

function readNiceClasses(attrs: Record<string, unknown>): string[] {
  if (!Array.isArray(attrs.niceClasses)) return []
  return attrs.niceClasses
    .map((c) => (typeof c === 'number' ? String(c) : String(c)))
    .filter(Boolean)
}

function readDeadlines(attrs: Record<string, unknown>): DeletionDeadline[] {
  if (!Array.isArray(attrs.deletionDeadlines)) return []
  return attrs.deletionDeadlines
    .filter((row) => row && typeof row === 'object' && !Array.isArray(row))
    .map((row) => {
      const d = row as Record<string, unknown>
      return {
        id: typeof d.id === 'string' ? d.id : crypto.randomUUID(),
        date: typeof d.date === 'string' ? d.date : '',
        deadline: typeof d.deadline === 'string' ? d.deadline : '',
        regarding: typeof d.regarding === 'string' ? d.regarding : '',
        details: typeof d.details === 'string' ? d.details : undefined,
      }
    })
    .filter((d) => d.regarding.trim())
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function readDeletionNotes(attrs: Record<string, unknown>): DeletionNote[] {
  if (!Array.isArray(attrs.deletionNotes)) return []
  return attrs.deletionNotes
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

function readFee(attrs: Record<string, unknown>): DeletionFee {
  const raw = readRecord(attrs.deletionFee)
  return {
    amount: typeof raw?.amount === 'string' ? raw.amount : undefined,
    paidDate: typeof raw?.paidDate === 'string' ? raw.paidDate : undefined,
    documentId: typeof raw?.documentId === 'string' ? raw.documentId : undefined,
  }
}

function readPoa(attrs: Record<string, unknown>): DeletionPoa {
  const raw = readRecord(attrs.deletionPoa)
  return {
    number: typeof raw?.number === 'string' ? raw.number : undefined,
    date: typeof raw?.date === 'string' ? raw.date : undefined,
    documentId: typeof raw?.documentId === 'string' ? raw.documentId : undefined,
  }
}

function readAppealStatus(attrs: Record<string, unknown>): DeletionAppealStatus | null {
  const raw = attrs.deletionAppealStatus
  if (raw === 'not_appealed' || raw === 'appealed') return raw
  return null
}

export function readDeletionFields(matter: MatterDetail) {
  const attrs = matter.attributes?.attributes ?? {}
  const prosecution = readRecord(attrs.prosecution)

  const stageRaw = attrs.deletionStage
  const deletionStage =
    typeof stageRaw === 'string' &&
    (DELETION_STAGES as readonly string[]).includes(stageRaw)
      ? (stageRaw as DeletionStage)
      : null

  const decisionRef = readRecord(attrs.deletionDecisionRef)

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
    registrationNumber:
      typeof attrs.registrationNumber === 'string' ? attrs.registrationNumber : '',
    registrationDate:
      typeof attrs.registrationDate === 'string' ? attrs.registrationDate : '',
    niceClasses: readNiceClasses(attrs),
    markType: typeof attrs.markType === 'string' ? attrs.markType : null,
    territory: territoryFromAttrs(attrs),
    representative:
      (typeof prosecution?.representatives === 'string' && prosecution.representatives) ||
      (typeof attrs.mol === 'string' && attrs.mol) ||
      '',
    grounds: typeof attrs.grounds === 'string' ? attrs.grounds : '',
    againstClasses:
      typeof attrs.againstClasses === 'string' ? attrs.againstClasses : '',
    submittedBy:
      typeof attrs.requester === 'string'
        ? attrs.requester
        : typeof attrs.oppositionFiler === 'string'
          ? attrs.oppositionFiler
          : '',
    deletionNumber:
      typeof attrs.deletionNumber === 'string' ? attrs.deletionNumber : '',
    deletionFilingDate:
      typeof attrs.deletionFilingDate === 'string' ? attrs.deletionFilingDate : '',
    deletionDecisionNumber:
      (typeof decisionRef?.number === 'string' && decisionRef.number) ||
      (typeof attrs.deletionDecisionNumber === 'string'
        ? attrs.deletionDecisionNumber
        : ''),
    deletionDecisionDate:
      (typeof decisionRef?.date === 'string' && decisionRef.date) ||
      (typeof attrs.deletionDecisionDate === 'string'
        ? attrs.deletionDecisionDate
        : ''),
    deletionStage,
    appealStatus: readAppealStatus(attrs),
    stopReason: typeof attrs.deletionStopReason === 'string' ? attrs.deletionStopReason : '',
    stopUntil: typeof attrs.deletionStopUntil === 'string' ? attrs.deletionStopUntil : '',
    restoreStage:
      typeof attrs.deletionRestoreStage === 'string' &&
      (DELETION_STAGES as readonly string[]).includes(attrs.deletionRestoreStage)
        ? (attrs.deletionRestoreStage as DeletionStage)
        : null,
    fee: readFee(attrs),
    poa: readPoa(attrs),
    deadlines: readDeadlines(attrs),
    events: readDeletionEvents(attrs),
    notes: readDeletionNotes(attrs),
    statusHistory: Array.isArray(attrs.deletionStatusHistory)
      ? attrs.deletionStatusHistory.filter(
          (line): line is string => typeof line === 'string' && line.trim().length > 0,
        )
      : [],
  }
}

export function deletionMarkTypeLabel(
  markType: string | null,
  territory: ReturnType<typeof territoryFromAttrs>,
): string {
  if (territory === 'eu') return 'CTM'
  if (!markType) return '—'
  return markType.replace(/_/g, ' ')
}

export function isDeletionStage(
  value: string | null | undefined,
): value is DeletionStage {
  return Boolean(value && (DELETION_STAGES as readonly string[]).includes(value))
}

export function deletionStageBadgeVariant(
  stage: string | null | undefined,
  matterStatus?: MatterStatus,
): DeletionStageBadgeVariant {
  if (stage && isDeletionStage(stage)) {
    return DELETION_STAGE_BADGE_VARIANT[stage]
  }
  if (matterStatus === 'closed') return 'success'
  if (matterStatus === 'on_hold') return 'secondary'
  if (matterStatus === 'draft') return 'secondary'
  return 'outline'
}

export function matterStatusForDeletionStage(
  stage: DeletionStage | null | undefined,
): MatterStatus | undefined {
  if (stage === 'closed') return 'closed'
  if (stage === 'stopped') return 'on_hold'
  return undefined
}

export function appendDeletionStatusHistory(
  existing: string[],
  entry: { stageLabel: string; userName: string; at?: Date },
): string[] {
  const at = entry.at ?? new Date()
  const stamp = at.toLocaleString()
  return [...existing, `${stamp} — ${entry.userName} — ${entry.stageLabel}`]
}

export function buildDefaultDeletionDeadlines(): DeletionDeadline[] {
  const today = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const addDays = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + n)
    return iso(d)
  }
  const base = iso(today)
  return [
    {
      id: crypto.randomUUID(),
      date: base,
      deadline: addDays(3),
      regarding: 'Deadline for payment of state fee for filing a deletion',
    },
    {
      id: crypto.randomUUID(),
      date: base,
      deadline: addDays(2),
      regarding: 'Deadline for sending power of attorney for filing a deletion',
    },
    {
      id: crypto.randomUUID(),
      date: base,
      deadline: addDays(2),
      regarding: 'Deadline for filing a deletion',
    },
  ]
}

export function buildDefaultAppealDeadline(): DeletionDeadline {
  const today = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const reminder = new Date(today)
  reminder.setDate(reminder.getDate() + 7)
  const deadline = new Date(today)
  deadline.setDate(deadline.getDate() + 14)
  return {
    id: crypto.randomUUID(),
    date: iso(reminder),
    deadline: iso(deadline),
    regarding: 'Deadline for appeal',
  }
}
