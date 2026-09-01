export const PROSECUTION_STAGES = [
  'prep',
  'filing',
  'formal_exam',
  'substantive_exam',
  'publication',
  'reg_fee',
  'registration',
] as const

export type ProsecutionStage = (typeof PROSECUTION_STAGES)[number]

/** Pipelines from client screenshots — territory is fixed at create-file time. */
export const PIPELINES: Record<'national' | 'eu' | 'international', ProsecutionStage[]> = {
  national: [
    'prep',
    'filing',
    'formal_exam',
    'substantive_exam',
    'publication',
    'reg_fee',
    'registration',
  ],
  eu: [
    'prep',
    'filing',
    'formal_exam',
    'substantive_exam',
    'publication',
    'registration',
  ],
  international: ['prep', 'filing', 'formal_exam', 'registration'],
}

export type ProsecutionHubSync = {
  paymentDeadline?: boolean
  poaDeadline?: boolean
  oaDeadline?: boolean
  stateFee?: boolean
  issuedInvoiceId?: string
  issuedInvoiceNumber?: string
}

export type ProsecutionState = {
  stage: ProsecutionStage
  applicationNumber?: string
  applicationDate?: string
  addRepresentatives?: boolean
  representatives?: string
  stateFeeBgn?: string
  paymentDeadline?: string
  paymentRemindDays?: string
  feePaidDate?: string
  generatePoa?: boolean
  sendPoaEmail?: boolean
  poaDeadline?: string
  poaIncomingNumber?: string
  poaDate?: string
  bulletinNumber?: string
  bulletinDate?: string
  officeActionSubject?: string
  officeActionDeadline?: string
  regFeePaidDate?: string
  /** Tracks one-time pushes from stage hub → Deadlines / Billing. */
  hubSync?: ProsecutionHubSync
}

export type FileApprovalLike = {
  clientConfirmed?: boolean
  partnerApproved?: boolean
}

export function territoryFromAttrs(
  attrs: Record<string, unknown>,
): 'national' | 'eu' | 'international' {
  const t = attrs.territory
  if (t === 'eu' || t === 'international' || t === 'national') return t
  return 'national'
}

export function readProsecution(
  attrs: Record<string, unknown>,
): ProsecutionState | null {
  const raw = attrs.prosecution
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const stage = (raw as ProsecutionState).stage
  if (!stage || !PROSECUTION_STAGES.includes(stage)) return null
  return raw as ProsecutionState
}

export function pipelineForTerritory(
  territory: 'national' | 'eu' | 'international',
): ProsecutionStage[] {
  return PIPELINES[territory]
}

export function nextStage(
  territory: 'national' | 'eu' | 'international',
  current: ProsecutionStage,
): ProsecutionStage | null {
  const pipe = PIPELINES[territory]
  const idx = pipe.indexOf(current)
  if (idx < 0 || idx >= pipe.length - 1) return null
  return pipe[idx + 1]
}

export function previousStage(
  territory: 'national' | 'eu' | 'international',
  current: ProsecutionStage,
): ProsecutionStage | null {
  const pipe = PIPELINES[territory]
  const idx = pipe.indexOf(current)
  if (idx <= 0) return null
  return pipe[idx - 1]
}

/**
 * Returns an i18n error key under prosecution.errors.* if the stage cannot advance.
 * Matches client demo: missing required data blocks "Complete stage".
 */
export function stageAdvanceBlockReason(
  stage: ProsecutionStage,
  data: ProsecutionState,
  attrs: Record<string, unknown>,
  approval: FileApprovalLike,
): string | null {
  switch (stage) {
    case 'prep':
      if (!approval.clientConfirmed || !approval.partnerApproved) {
        return 'needApproval'
      }
      return null
    case 'filing': {
      const mol = typeof attrs.mol === 'string' ? attrs.mol.trim() : ''
      if (!mol) return 'needMol'
      if (!data.applicationNumber?.trim() || !data.applicationDate) {
        return 'needFilingFields'
      }
      if (data.addRepresentatives !== false && !data.representatives?.trim()) {
        return 'needRepresentative'
      }
      return null
    }
    case 'formal_exam':
      if (!data.stateFeeBgn?.trim() || !data.paymentDeadline) {
        return 'needFormalFields'
      }
      if (!data.feePaidDate) return 'needFeePaid'
      if (!data.poaIncomingNumber?.trim() || !data.poaDate) {
        return 'needPoaFiled'
      }
      return null
    case 'substantive_exam':
      // Office action is optional; if started, deadline is required before leaving.
      if (data.officeActionSubject?.trim() && !data.officeActionDeadline) {
        return 'needOfficeActionDeadline'
      }
      return null
    case 'publication':
      if (!data.bulletinNumber?.trim() || !data.bulletinDate) {
        return 'needBulletin'
      }
      return null
    case 'reg_fee':
      if (!data.regFeePaidDate && !data.feePaidDate) {
        return 'needRegFeePaid'
      }
      return null
    case 'registration':
      return 'alreadyFinal'
    default:
      return null
  }
}

export function isCreateFileTrademark(attrs: Record<string, unknown>): boolean {
  return typeof attrs.trademarkProcedure === 'string'
}

export type PatentFilingRoute =
  | 'national'
  | 'european'
  | 'ep_validation'
  | 'pct'

/** Patent prosecution pipelines — mirrors legacy WorkPatent / WorkValPatent. */
export const PATENT_PIPELINES: Record<PatentFilingRoute, ProsecutionStage[]> = {
  national: PIPELINES.national,
  european: PIPELINES.eu,
  ep_validation: ['prep', 'filing', 'formal_exam', 'registration'],
  pct: PIPELINES.international,
}

export function patentRouteFromAttrs(
  attrs: Record<string, unknown>,
): PatentFilingRoute | null {
  const route = attrs.patentProcedure
  if (
    route === 'national' ||
    route === 'european' ||
    route === 'ep_validation' ||
    route === 'pct'
  ) {
    return route
  }
  return null
}

export function defaultPatentRoute(
  attrs: Record<string, unknown>,
): PatentFilingRoute {
  return patentRouteFromAttrs(attrs) ?? 'national'
}

export function pipelineForPatentRoute(
  route: PatentFilingRoute,
): ProsecutionStage[] {
  return PATENT_PIPELINES[route]
}

export function nextPatentStage(
  route: PatentFilingRoute,
  current: ProsecutionStage,
): ProsecutionStage | null {
  const pipe = PATENT_PIPELINES[route]
  const idx = pipe.indexOf(current)
  if (idx < 0 || idx >= pipe.length - 1) return null
  return pipe[idx + 1]
}

export function previousPatentStage(
  route: PatentFilingRoute,
  current: ProsecutionStage,
): ProsecutionStage | null {
  const pipe = PATENT_PIPELINES[route]
  const idx = pipe.indexOf(current)
  if (idx <= 0) return null
  return pipe[idx - 1]
}

export function prosecutionStageLabelKey(
  matterType: 'trademark' | 'patent' | 'design',
  stage: ProsecutionStage,
  attrs: Record<string, unknown>,
): string {
  if (matterType === 'patent' && patentRouteFromAttrs(attrs) === 'ep_validation') {
    return `prosecution.patentStages.ep_validation.${stage}`
  }
  return `prosecution.stages.${stage}`
}

export type DesignFilingRoute = 'wipo' | 'national' | 'euipo'

/**
 * Legacy WorkRegDesign prosecution — publication precedes substantive examination.
 * Same 7-step bar for national, EUIPO, and WIPO registered designs.
 */
export const DESIGN_PIPELINE: ProsecutionStage[] = [
  'prep',
  'filing',
  'formal_exam',
  'publication',
  'substantive_exam',
  'reg_fee',
  'registration',
]

export function designRouteFromAttrs(
  attrs: Record<string, unknown>,
): DesignFilingRoute | null {
  const route = attrs.designProcedure
  if (route === 'wipo' || route === 'national' || route === 'euipo') {
    return route
  }
  return null
}

export function defaultDesignRoute(attrs: Record<string, unknown>): DesignFilingRoute {
  return designRouteFromAttrs(attrs) ?? 'national'
}

export function pipelineForDesignRoute(
  _route: DesignFilingRoute,
): ProsecutionStage[] {
  return DESIGN_PIPELINE
}

function nextInPipeline(
  pipe: ProsecutionStage[],
  current: ProsecutionStage,
): ProsecutionStage | null {
  const idx = pipe.indexOf(current)
  if (idx < 0 || idx >= pipe.length - 1) return null
  return pipe[idx + 1]
}

function previousInPipeline(
  pipe: ProsecutionStage[],
  current: ProsecutionStage,
): ProsecutionStage | null {
  const idx = pipe.indexOf(current)
  if (idx <= 0) return null
  return pipe[idx - 1]
}

export function nextDesignStage(
  route: DesignFilingRoute,
  current: ProsecutionStage,
): ProsecutionStage | null {
  return nextInPipeline(pipelineForDesignRoute(route), current)
}

export function previousDesignStage(
  route: DesignFilingRoute,
  current: ProsecutionStage,
): ProsecutionStage | null {
  return previousInPipeline(pipelineForDesignRoute(route), current)
}

/** Legacy WorkModel — same 7-step bar as registered designs. */
export const UTILITY_MODEL_PIPELINE: ProsecutionStage[] = DESIGN_PIPELINE

export function pipelineForUtilityModel(): ProsecutionStage[] {
  return UTILITY_MODEL_PIPELINE
}

export function nextUtilityModelStage(
  current: ProsecutionStage,
): ProsecutionStage | null {
  return nextInPipeline(UTILITY_MODEL_PIPELINE, current)
}

export function previousUtilityModelStage(
  current: ProsecutionStage,
): ProsecutionStage | null {
  return previousInPipeline(UTILITY_MODEL_PIPELINE, current)
}
