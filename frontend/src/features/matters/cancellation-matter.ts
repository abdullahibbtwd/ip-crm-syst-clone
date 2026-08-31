import type { MatterDetail, MatterStatus } from './types'
import { territoryFromAttrs } from './prosecution-stages'
import { readCancellationEvents } from './cancellation-workflow'

export const CANCELLATION_ARCHIVE_TAG = 'cancellation-archive'

export const CANCELLATION_STAGES = [
  'waiting_for_login',
  'in_correspondence',
  'case',
  'stopped',
  'closed',
] as const

export type CancellationStage = (typeof CANCELLATION_STAGES)[number]

export type CancellationStageBadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'outline'

export const CANCELLATION_STAGE_BADGE_VARIANT: Record<
  CancellationStage,
  CancellationStageBadgeVariant
> = {
  waiting_for_login: 'warning',
  in_correspondence: 'info',
  case: 'destructive',
  stopped: 'secondary',
  closed: 'success',
}

export type CancellationDeadline = {
  id: string
  date: string
  deadline: string
  regarding: string
  details?: string
}

export type CancellationNote = {
  id: string
  createdAt: string
  regarding: string
  details: string
  userName?: string
}

export type CancellationFee = {
  amount?: string
  paidDate?: string
  documentId?: string
}

export type CancellationPoa = {
  number?: string
  date?: string
  documentId?: string
}

export function isCancellationMatter(
  matter: Pick<MatterDetail, 'matterType' | 'attributes'>,
): boolean {
  if (matter.matterType !== 'trademark') return false
  return matter.attributes?.attributes?.trademarkProcedure === 'cancellation'
}

function readNiceClasses(attrs: Record<string, unknown>): string[] {
  if (!Array.isArray(attrs.niceClasses)) return []
  return attrs.niceClasses
    .map((c) => (typeof c === 'number' ? String(c) : String(c)))
    .filter(Boolean)
}

function readDeadlines(attrs: Record<string, unknown>): CancellationDeadline[] {
  if (!Array.isArray(attrs.cancellationDeadlines)) return []
  return attrs.cancellationDeadlines
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

export function readCancellationNotes(attrs: Record<string, unknown>): CancellationNote[] {
  if (!Array.isArray(attrs.cancellationNotes)) return []
  return attrs.cancellationNotes
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

function readFee(attrs: Record<string, unknown>): CancellationFee {
  const raw = readRecord(attrs.cancellationFee)
  return {
    amount: typeof raw?.amount === 'string' ? raw.amount : undefined,
    paidDate: typeof raw?.paidDate === 'string' ? raw.paidDate : undefined,
    documentId: typeof raw?.documentId === 'string' ? raw.documentId : undefined,
  }
}

function readPoa(attrs: Record<string, unknown>): CancellationPoa {
  const raw = readRecord(attrs.cancellationPoa)
  return {
    number: typeof raw?.number === 'string' ? raw.number : undefined,
    date: typeof raw?.date === 'string' ? raw.date : undefined,
    documentId: typeof raw?.documentId === 'string' ? raw.documentId : undefined,
  }
}

export function readCancellationFields(matter: MatterDetail) {
  const attrs = matter.attributes?.attributes ?? {}
  const prosecution = readRecord(attrs.prosecution)

  const stageRaw = attrs.cancellationStage
  const cancellationStage =
    typeof stageRaw === 'string' &&
    (CANCELLATION_STAGES as readonly string[]).includes(stageRaw)
      ? (stageRaw as CancellationStage)
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
    cancellationNumber:
      typeof attrs.cancellationNumber === 'string' ? attrs.cancellationNumber : '',
    cancellationFilingDate:
      typeof attrs.cancellationFilingDate === 'string'
        ? attrs.cancellationFilingDate
        : '',
    cancellationStage,
    fee: readFee(attrs),
    poa: readPoa(attrs),
    deadlines: readDeadlines(attrs),
    events: readCancellationEvents(attrs),
    notes: readCancellationNotes(attrs),
    statusHistory: Array.isArray(attrs.cancellationStatusHistory)
      ? attrs.cancellationStatusHistory.filter(
          (line): line is string => typeof line === 'string' && line.trim().length > 0,
        )
      : [],
  }
}

export function cancellationMarkTypeLabel(
  markType: string | null,
  territory: ReturnType<typeof territoryFromAttrs>,
): string {
  if (territory === 'eu') return 'CTM'
  if (!markType) return '—'
  return markType.replace(/_/g, ' ')
}

export function isCancellationStage(
  value: string | null | undefined,
): value is CancellationStage {
  return Boolean(value && (CANCELLATION_STAGES as readonly string[]).includes(value))
}

export function cancellationStageBadgeVariant(
  stage: string | null | undefined,
  matterStatus?: MatterStatus,
): CancellationStageBadgeVariant {
  if (stage && isCancellationStage(stage)) {
    return CANCELLATION_STAGE_BADGE_VARIANT[stage]
  }
  if (matterStatus === 'closed') return 'success'
  if (matterStatus === 'on_hold') return 'secondary'
  if (matterStatus === 'draft') return 'secondary'
  return 'outline'
}

export function matterStatusForCancellationStage(
  stage: CancellationStage | null | undefined,
): MatterStatus | undefined {
  if (stage === 'closed') return 'closed'
  if (stage === 'stopped') return 'on_hold'
  return undefined
}

export function appendCancellationStatusHistory(
  existing: string[],
  entry: { stageLabel: string; userName: string; at?: Date },
): string[] {
  const at = entry.at ?? new Date()
  const stamp = at.toLocaleString()
  return [...existing, `${stamp} — ${entry.userName} — ${entry.stageLabel}`]
}

export function buildDefaultCancellationDeadlines(): CancellationDeadline[] {
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
      regarding: 'Deadline for payment of state fee for filing a cancellation',
    },
    {
      id: crypto.randomUUID(),
      date: base,
      deadline: addDays(2),
      regarding: 'Deadline for sending power of attorney for filing a cancellation',
    },
    {
      id: crypto.randomUUID(),
      date: base,
      deadline: addDays(2),
      regarding: 'Deadline for filing a cancellation',
    },
  ]
}
