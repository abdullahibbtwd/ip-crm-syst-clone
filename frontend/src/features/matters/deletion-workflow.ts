import type { DeletionStage } from './deletion-matter'

export type DeletionEventKind =
  | 'fee_paid'
  | 'poa_received'
  | 'filing'
  | 'correspondence'
  | 'decision'
  | 'appeal'
  | 'not_appealed'
  | 'stage'

export type DeletionEvent = {
  id: string
  kind: DeletionEventKind
  label: string
  at: string
  regarding?: string
  documentId?: string
  deletionNumber?: string
  deletionDate?: string
  decisionNumber?: string
  decisionDate?: string
}

export type DeletionWorkflowPanel =
  | 'none'
  | 'pre_filing'
  | 'correspondence'
  | 'decision_entry'
  | 'appeal'

export type DeletionStageConfig = {
  headerKey: string
  workflowPanel: DeletionWorkflowPanel
  showCaseDraftButton: boolean
  showStoppedBanner: boolean
  showArchivedBanner: boolean
}

export const DELETION_STAGE_CONFIG: Record<DeletionStage, DeletionStageConfig> = {
  waiting_for_login: {
    headerKey: 'deletionView.headers.waiting_for_login',
    workflowPanel: 'pre_filing',
    showCaseDraftButton: false,
    showStoppedBanner: false,
    showArchivedBanner: false,
  },
  in_correspondence: {
    headerKey: 'deletionView.headers.in_correspondence',
    workflowPanel: 'correspondence',
    showCaseDraftButton: false,
    showStoppedBanner: false,
    showArchivedBanner: false,
  },
  decision: {
    headerKey: 'deletionView.headers.decision',
    workflowPanel: 'appeal',
    showCaseDraftButton: false,
    showStoppedBanner: false,
    showArchivedBanner: false,
  },
  case: {
    headerKey: 'deletionView.headers.case',
    workflowPanel: 'none',
    showCaseDraftButton: false,
    showStoppedBanner: false,
    showArchivedBanner: false,
  },
  stopped: {
    headerKey: 'deletionView.headers.stopped',
    workflowPanel: 'none',
    showCaseDraftButton: false,
    showStoppedBanner: true,
    showArchivedBanner: false,
  },
  closed: {
    headerKey: 'deletionView.headers.closed',
    workflowPanel: 'none',
    showCaseDraftButton: false,
    showStoppedBanner: false,
    showArchivedBanner: true,
  },
}

export function deletionStageConfig(
  stage: DeletionStage | null | undefined,
): DeletionStageConfig {
  if (stage && stage in DELETION_STAGE_CONFIG) {
    return DELETION_STAGE_CONFIG[stage]
  }
  return {
    headerKey: 'deletionView.pageTitle',
    workflowPanel: 'pre_filing',
    showCaseDraftButton: false,
    showStoppedBanner: false,
    showArchivedBanner: false,
  }
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function readDeletionEvents(attrs: Record<string, unknown>): DeletionEvent[] {
  const raw = attrs.deletionEvents
  if (!Array.isArray(raw)) return []
  const validKinds: DeletionEventKind[] = [
    'fee_paid',
    'poa_received',
    'filing',
    'correspondence',
    'decision',
    'appeal',
    'not_appealed',
    'stage',
  ]
  return raw
    .filter((row) => row && typeof row === 'object' && !Array.isArray(row))
    .map((row) => {
      const e = row as Record<string, unknown>
      const kind = e.kind
      return {
        id: readString(e.id) ?? crypto.randomUUID(),
        kind:
          typeof kind === 'string' && validKinds.includes(kind as DeletionEventKind)
            ? (kind as DeletionEventKind)
            : 'stage',
        label: readString(e.label) ?? '—',
        at: readString(e.at) ?? new Date().toISOString(),
        regarding: readString(e.regarding),
        documentId: readString(e.documentId),
        deletionNumber: readString(e.deletionNumber),
        deletionDate: readString(e.deletionDate),
        decisionNumber: readString(e.decisionNumber),
        decisionDate: readString(e.decisionDate),
      }
    })
}

export function appendDeletionEvent(
  existing: DeletionEvent[],
  event: Omit<DeletionEvent, 'id'> & { id?: string },
): DeletionEvent[] {
  return [...existing, { ...event, id: event.id ?? crypto.randomUUID() }]
}

export function readDeletionDecisionRef(attrs: Record<string, unknown>): {
  number: string | null
  date: string | null
} {
  const ref =
    attrs.deletionDecisionRef &&
    typeof attrs.deletionDecisionRef === 'object' &&
    !Array.isArray(attrs.deletionDecisionRef)
      ? (attrs.deletionDecisionRef as Record<string, unknown>)
      : null
  return {
    number: readString(ref?.number) ?? readString(attrs.deletionDecisionNumber) ?? null,
    date: readString(ref?.date) ?? readString(attrs.deletionDecisionDate) ?? null,
  }
}

export function deletionHeaderParams(attrs: Record<string, unknown>): {
  number?: string
  date?: string
  markRef?: string
} {
  const filing = {
    number: readString(attrs.deletionNumber) ?? undefined,
    date: readString(attrs.deletionFilingDate) ?? undefined,
  }
  const decision = readDeletionDecisionRef(attrs)
  if (decision.number || decision.date) {
    return {
      number: decision.number ?? undefined,
      date: decision.date ?? undefined,
    }
  }
  return filing
}

export function deletionDecisionRefPatch(
  number: string,
  date: string,
): Record<string, unknown> {
  const trimmedNumber = number.trim()
  const trimmedDate = date.trim()
  if (!trimmedNumber && !trimmedDate) return {}
  return {
    deletionDecisionRef: {
      number: trimmedNumber || undefined,
      date: trimmedDate || undefined,
    },
    deletionDecisionNumber: trimmedNumber || undefined,
    deletionDecisionDate: trimmedDate || undefined,
  }
}
