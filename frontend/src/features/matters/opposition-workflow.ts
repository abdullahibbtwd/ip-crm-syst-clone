import type { OppositionStage } from './opposition-matter'

/** Structured timeline entries (decisions, appeals, correspondence). */
export type OppositionEventKind =
  | 'decision'
  | 'department_decision'
  | 'second_decision'
  | 'appeal'
  | 'court_appeal'
  | 'correspondence'
  | 'stage'

export type OppositionEvent = {
  id: string
  kind: OppositionEventKind
  label: string
  at: string
  incomingNumber?: string
  decisionNumber?: string
  decisionDate?: string
  appealedBy?: string
  documentId?: string
  regarding?: string
}

/** Bottom workflow panel shown for each opposition stage (legacy WorkInsertedOposition.php). */
export type OppositionWorkflowPanel =
  | 'none'
  | 'correspondence'
  | 'appeal'
  | 'case_draft'
  | 'solution'

export type OppositionStageConfig = {
  headerKey: string
  workflowPanel: OppositionWorkflowPanel
  showCaseDraftButton: boolean
}

export const OPPOSITION_STAGE_CONFIG: Record<OppositionStage, OppositionStageConfig> = {
  disputes_division: {
    headerKey: 'oppositionView.headers.disputes_division',
    workflowPanel: 'correspondence',
    showCaseDraftButton: false,
  },
  opposition_decision: {
    headerKey: 'oppositionView.headers.opposition_decision',
    workflowPanel: 'appeal',
    showCaseDraftButton: true,
  },
  disputes_department_decision: {
    headerKey: 'oppositionView.headers.disputes_department_decision',
    workflowPanel: 'appeal',
    showCaseDraftButton: false,
  },
  case: {
    headerKey: 'oppositionView.headers.case',
    workflowPanel: 'solution',
    showCaseDraftButton: false,
  },
  stopped: {
    headerKey: 'oppositionView.headers.stopped',
    workflowPanel: 'none',
    showCaseDraftButton: false,
  },
  closed: {
    headerKey: 'oppositionView.headers.closed',
    workflowPanel: 'none',
    showCaseDraftButton: false,
  },
}

export function oppositionStageConfig(
  stage: OppositionStage | null | undefined,
): OppositionStageConfig {
  if (stage && stage in OPPOSITION_STAGE_CONFIG) {
    return OPPOSITION_STAGE_CONFIG[stage]
  }
  return {
    headerKey: 'oppositionView.pageTitle',
    workflowPanel: 'correspondence',
    showCaseDraftButton: false,
  }
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function readOppositionEvents(attrs: Record<string, unknown>): OppositionEvent[] {
  const raw = attrs.oppositionEvents
  if (!Array.isArray(raw)) return []
  return raw
    .filter((row) => row && typeof row === 'object' && !Array.isArray(row))
    .map((row) => {
      const e = row as Record<string, unknown>
      const kind = e.kind
      const validKinds: OppositionEventKind[] = [
        'decision',
        'department_decision',
        'second_decision',
        'appeal',
        'court_appeal',
        'correspondence',
        'stage',
      ]
      return {
        id: readString(e.id) ?? crypto.randomUUID(),
        kind:
          typeof kind === 'string' && validKinds.includes(kind as OppositionEventKind)
            ? (kind as OppositionEventKind)
            : 'stage',
        label: readString(e.label) ?? '—',
        at: readString(e.at) ?? new Date().toISOString(),
        incomingNumber: readString(e.incomingNumber),
        decisionNumber: readString(e.decisionNumber),
        decisionDate: readString(e.decisionDate),
        appealedBy: readString(e.appealedBy),
        documentId: readString(e.documentId),
        regarding: readString(e.regarding),
      }
    })
}

export function readOppositionDecisionRef(attrs: Record<string, unknown>): {
  number: string | null
  date: string | null
} {
  const ref =
    attrs.oppositionDecisionRef &&
    typeof attrs.oppositionDecisionRef === 'object' &&
    !Array.isArray(attrs.oppositionDecisionRef)
      ? (attrs.oppositionDecisionRef as Record<string, unknown>)
      : null
  return {
    number: readString(ref?.number) ?? readString(attrs.oppositionDecisionNumber) ?? null,
    date: readString(ref?.date) ?? readString(attrs.oppositionDecisionDate) ?? null,
  }
}

export function appendOppositionEvent(
  existing: OppositionEvent[],
  event: Omit<OppositionEvent, 'id'> & { id?: string },
): OppositionEvent[] {
  return [
    ...existing,
    {
      ...event,
      id: event.id ?? crypto.randomUUID(),
    },
  ]
}

export function oppositionHeaderParams(
  attrs: Record<string, unknown>,
  stage: OppositionStage | null | undefined,
): { number?: string; date?: string } {
  const ref = readOppositionDecisionRef(attrs)
  if (ref.number || ref.date) return { number: ref.number ?? undefined, date: ref.date ?? undefined }
  if (stage === 'case') {
    return {
      number: readString(attrs.oppositionCaseNumber),
      date: readString(attrs.oppositionCaseDate),
    }
  }
  return {}
}

export const OPPOSITION_DECISION_STAGES = [
  'opposition_decision',
  'disputes_department_decision',
] as const satisfies readonly OppositionStage[]

export function stageUsesDecisionRef(stage: OppositionStage | null | undefined): boolean {
  return (
    stage === 'opposition_decision' ||
    stage === 'disputes_department_decision' ||
    stage === 'case'
  )
}

export function stageCapturesDecisionOnSave(
  stage: OppositionStage | null | undefined,
): boolean {
  return (
    stage === 'opposition_decision' || stage === 'disputes_department_decision'
  )
}

/** Maps a stage transition to the structured timeline event kind. */
export function decisionEventKindForStage(
  stage: OppositionStage,
  events: OppositionEvent[],
): OppositionEventKind | null {
  if (stage === 'opposition_decision') {
    const hasDecision = events.some((e) => e.kind === 'decision')
    return hasDecision ? 'second_decision' : 'decision'
  }
  if (stage === 'disputes_department_decision') {
    return 'department_decision'
  }
  return null
}

export function oppositionDecisionRefPatch(
  number: string,
  date: string,
): Record<string, unknown> {
  const trimmedNumber = number.trim()
  const trimmedDate = date.trim()
  if (!trimmedNumber && !trimmedDate) return {}
  return {
    oppositionDecisionRef: {
      number: trimmedNumber || undefined,
      date: trimmedDate || undefined,
    },
    oppositionDecisionNumber: trimmedNumber || undefined,
    oppositionDecisionDate: trimmedDate || undefined,
  }
}
