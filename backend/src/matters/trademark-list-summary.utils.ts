/** Prosecution pipeline stages stored on matter attributes. */
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

export type TrademarkTerritory = 'national' | 'eu' | 'international'

export type TrademarkListSummary = {
  territory: TrademarkTerritory | null
  prosecutionStage: ProsecutionStage | null
  niceClasses: string[]
  markType: string | null
  /** Filing / incoming reference — prosecution application, then create-file attrs, then PoA incoming. */
  incomingNumber: string | null
  incomingDate: string | null
  registrationNumber: string | null
  registrationDate: string | null
  markImageDocumentId: string | null
  markImageDocumentVersionId: string | null
  /** Objection / opposition grounds text from create-file. */
  grounds: string | null
  oppositionStage: string | null
  cancellationStage: string | null
  deletionStage: string | null
}

type IpRightRegistrationSlice = {
  applicationNumber: string | null
  registrationNumber: string | null
  filingDate: Date | null
  registrationDate: Date | null
} | null

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readIsoDate(value: unknown): string | null {
  const s = readString(value)
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function readTerritory(attrs: Record<string, unknown>): TrademarkTerritory | null {
  const t = attrs.territory
  if (t === 'national' || t === 'eu' || t === 'international') return t
  return null
}

function readProsecutionStage(
  attrs: Record<string, unknown>,
): ProsecutionStage | null {
  const prosecution = asRecord(attrs.prosecution)
  const stage = prosecution?.stage
  if (
    typeof stage === 'string' &&
    (PROSECUTION_STAGES as readonly string[]).includes(stage)
  ) {
    return stage as ProsecutionStage
  }
  return null
}

function readNiceClasses(attrs: Record<string, unknown>): string[] {
  const raw = attrs.niceClasses
  if (!Array.isArray(raw)) return []
  return raw
    .map((c) => (typeof c === 'number' ? String(c) : readString(c)))
    .filter((c): c is string => Boolean(c))
}

function resolveIncomingRef(
  attrs: Record<string, unknown>,
  ipRight: IpRightRegistrationSlice,
): { number: string | null; date: string | null } {
  const prosecution = asRecord(attrs.prosecution)

  const fromProsecution = {
    number: readString(prosecution?.applicationNumber),
    date: readIsoDate(prosecution?.applicationDate),
  }
  if (fromProsecution.number) return fromProsecution

  const fromAttrs = {
    number: readString(attrs.applicationNumber),
    date: readIsoDate(attrs.applicationDate),
  }
  if (fromAttrs.number) return fromAttrs

  const fromPoa = {
    number: readString(prosecution?.poaIncomingNumber),
    date: readIsoDate(prosecution?.poaDate),
  }
  if (fromPoa.number) return fromPoa

  if (ipRight?.applicationNumber) {
    return {
      number: ipRight.applicationNumber,
      date: ipRight.filingDate
        ? ipRight.filingDate.toISOString().slice(0, 10)
        : null,
    }
  }

  return { number: null, date: null }
}

function resolveRegistration(
  attrs: Record<string, unknown>,
  ipRight: IpRightRegistrationSlice,
): { number: string | null; date: string | null } {
  if (ipRight?.registrationNumber) {
    return {
      number: ipRight.registrationNumber,
      date: ipRight.registrationDate
        ? ipRight.registrationDate.toISOString().slice(0, 10)
        : null,
    }
  }

  return {
    number: readString(attrs.registrationNumber),
    date: readIsoDate(attrs.registrationDate),
  }
}

/**
 * Builds trademark portfolio row fields from matter attributes and optional primary IP right.
 */
export function extractTrademarkListSummary(
  rawAttributes: unknown,
  ipRight: IpRightRegistrationSlice = null,
  options?: { defaultStage?: ProsecutionStage | null },
): TrademarkListSummary | null {
  const attrs = asRecord(rawAttributes)
  if (!attrs) {
    return {
      territory: null,
      prosecutionStage: options?.defaultStage ?? 'prep',
      niceClasses: [],
      markType: null,
      incomingNumber: ipRight?.applicationNumber ?? null,
      incomingDate: ipRight?.filingDate
        ? ipRight.filingDate.toISOString().slice(0, 10)
        : null,
      registrationNumber: ipRight?.registrationNumber ?? null,
      registrationDate: ipRight?.registrationDate
        ? ipRight.registrationDate.toISOString().slice(0, 10)
        : null,
      markImageDocumentId: null,
      markImageDocumentVersionId: null,
      grounds: null,
      oppositionStage: null,
      cancellationStage: null,
      deletionStage: null,
    }
  }

  const incoming = resolveIncomingRef(attrs, ipRight)
  const registration = resolveRegistration(attrs, ipRight)

  return {
    territory: readTerritory(attrs),
    prosecutionStage: readProsecutionStage(attrs) ?? options?.defaultStage ?? 'prep',
    niceClasses: readNiceClasses(attrs),
    markType: readString(attrs.markType),
    incomingNumber: incoming.number,
    incomingDate: incoming.date,
    registrationNumber: registration.number,
    registrationDate: registration.date,
    markImageDocumentId: readString(attrs.markImageDocumentId),
    markImageDocumentVersionId: readString(attrs.markImageDocumentVersionId),
    grounds: readString(attrs.grounds),
    oppositionStage: readString(attrs.oppositionStage),
    cancellationStage: readString(attrs.cancellationStage),
    deletionStage: readString(attrs.deletionStage),
  }
}
