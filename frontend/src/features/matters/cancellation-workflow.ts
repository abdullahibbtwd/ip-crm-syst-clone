import type { CancellationStage } from './cancellation-matter'

export type CancellationEventKind =
  | 'fee_paid'
  | 'poa_received'
  | 'filing'
  | 'correspondence'
  | 'decision'
  | 'stage'

export type CancellationEvent = {
  id: string
  kind: CancellationEventKind
  label: string
  at: string
  regarding?: string
  documentId?: string
  cancellationNumber?: string
  cancellationDate?: string
}

export type CancellationWorkflowPanel =
  | 'none'
  | 'pre_filing'
  | 'correspondence'
  | 'decision'

export type CancellationStageConfig = {
  headerKey: string
  workflowPanel: CancellationWorkflowPanel
  showDecisionButton: boolean
}

export const CANCELLATION_STAGE_CONFIG: Record<CancellationStage, CancellationStageConfig> =
  {
    waiting_for_login: {
      headerKey: 'cancellationView.headers.waiting_for_login',
      workflowPanel: 'pre_filing',
      showDecisionButton: false,
    },
    in_correspondence: {
      headerKey: 'cancellationView.headers.in_correspondence',
      workflowPanel: 'correspondence',
      showDecisionButton: true,
    },
    case: {
      headerKey: 'cancellationView.headers.case',
      workflowPanel: 'none',
      showDecisionButton: false,
    },
    stopped: {
      headerKey: 'cancellationView.headers.stopped',
      workflowPanel: 'none',
      showDecisionButton: false,
    },
    closed: {
      headerKey: 'cancellationView.headers.closed',
      workflowPanel: 'none',
      showDecisionButton: false,
    },
  }

export function cancellationStageConfig(
  stage: CancellationStage | null | undefined,
): CancellationStageConfig {
  if (stage && stage in CANCELLATION_STAGE_CONFIG) {
    return CANCELLATION_STAGE_CONFIG[stage]
  }
  return {
    headerKey: 'cancellationView.pageTitle',
    workflowPanel: 'pre_filing',
    showDecisionButton: false,
  }
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function readCancellationEvents(attrs: Record<string, unknown>): CancellationEvent[] {
  const raw = attrs.cancellationEvents
  if (!Array.isArray(raw)) return []
  const validKinds: CancellationEventKind[] = [
    'fee_paid',
    'poa_received',
    'filing',
    'correspondence',
    'decision',
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
          typeof kind === 'string' && validKinds.includes(kind as CancellationEventKind)
            ? (kind as CancellationEventKind)
            : 'stage',
        label: readString(e.label) ?? '—',
        at: readString(e.at) ?? new Date().toISOString(),
        regarding: readString(e.regarding),
        documentId: readString(e.documentId),
        cancellationNumber: readString(e.cancellationNumber),
        cancellationDate: readString(e.cancellationDate),
      }
    })
}

export function appendCancellationEvent(
  existing: CancellationEvent[],
  event: Omit<CancellationEvent, 'id'> & { id?: string },
): CancellationEvent[] {
  return [...existing, { ...event, id: event.id ?? crypto.randomUUID() }]
}

export function cancellationHeaderParams(attrs: Record<string, unknown>): {
  number?: string
  date?: string
  markRef?: string
} {
  return {
    number: readString(attrs.cancellationNumber) ?? undefined,
    date: readString(attrs.cancellationFilingDate) ?? undefined,
  }
}
