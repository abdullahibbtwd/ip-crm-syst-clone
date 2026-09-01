import {
  PROSECUTION_STAGES,
  type ProsecutionStage,
} from './trademark-list-summary.utils'

export type PatentSubtype = 'new' | 'registered'

export type PatentFilingRoute =
  | 'national'
  | 'european'
  | 'ep_validation'
  | 'pct'

export type PatentListSummary = {
  patentSubtype: PatentSubtype | null
  patentProcedure: PatentFilingRoute | null
  /** Primary jurisdiction code (BG, EP, RO, …). */
  territoryCode: string | null
  prosecutionStage: ProsecutionStage | null
  claimsSummary: string | null
  ipcClasses: string[]
  incomingNumber: string | null
  incomingDate: string | null
  registrationNumber: string | null
  registrationDate: string | null
  ownerName: string | null
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

function readPatentSubtype(attrs: Record<string, unknown>): PatentSubtype | null {
  const subtype = attrs.patentSubtype
  if (subtype === 'new' || subtype === 'registered') return subtype
  return null
}

function readPatentProcedure(
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

function readIpcClasses(attrs: Record<string, unknown>): string[] {
  const raw = attrs.ipcClasses
  if (!Array.isArray(raw)) return []
  return raw
    .map((c) => readString(c))
    .filter((c): c is string => Boolean(c))
}

function readClaimsSummary(attrs: Record<string, unknown>): string | null {
  const direct = readString(attrs.claimsSummary)
  if (direct) return direct

  const claims = attrs.claims
  if (!Array.isArray(claims)) return null

  const parts = claims
    .map((row) => {
      const claim = asRecord(row)
      if (!claim) return null
      const number = readString(claim.number)
      return number ? `${number},` : null
    })
    .filter((c): c is string => Boolean(c))

  return parts.length > 0 ? parts.join(' ') : null
}

function readOwnerName(attrs: Record<string, unknown>): string | null {
  if (attrs.ownerSameAsClient === true) return null
  return readString(attrs.ownerLegalName)
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

  const epApp = readString(attrs.epApplicationNumber)
  if (epApp) {
    return {
      number: epApp,
      date: readIsoDate(attrs.epApplicationDate),
    }
  }

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

  const epReg = readString(attrs.epRegistrationNumber)
  if (epReg) {
    return {
      number: epReg,
      date: readIsoDate(attrs.epRegistrationDate),
    }
  }

  return {
    number: readString(attrs.registrationNumber),
    date: readIsoDate(attrs.registrationDate),
  }
}

/**
 * Builds patent portfolio row fields from matter attributes and optional primary IP right.
 */
export function extractPatentListSummary(
  rawAttributes: unknown,
  ipRight: IpRightRegistrationSlice = null,
  options?: {
    defaultStage?: ProsecutionStage | null
    territoryCode?: string | null
  },
): PatentListSummary {
  const attrs = asRecord(rawAttributes)
  if (!attrs) {
    const incomingFromIp = ipRight?.applicationNumber
      ? {
          number: ipRight.applicationNumber,
          date: ipRight.filingDate
            ? ipRight.filingDate.toISOString().slice(0, 10)
            : null,
        }
      : { number: null, date: null }

    return {
      patentSubtype: null,
      patentProcedure: null,
      territoryCode: options?.territoryCode ?? null,
      prosecutionStage: options?.defaultStage ?? 'prep',
      claimsSummary: null,
      ipcClasses: [],
      incomingNumber: incomingFromIp.number,
      incomingDate: incomingFromIp.date,
      registrationNumber: ipRight?.registrationNumber ?? null,
      registrationDate: ipRight?.registrationDate
        ? ipRight.registrationDate.toISOString().slice(0, 10)
        : null,
      ownerName: null,
    }
  }

  const incoming = resolveIncomingRef(attrs, ipRight)
  const registration = resolveRegistration(attrs, ipRight)

  return {
    patentSubtype: readPatentSubtype(attrs),
    patentProcedure: readPatentProcedure(attrs),
    territoryCode: options?.territoryCode ?? null,
    prosecutionStage:
      readProsecutionStage(attrs) ?? options?.defaultStage ?? 'prep',
    claimsSummary: readClaimsSummary(attrs),
    ipcClasses: readIpcClasses(attrs),
    incomingNumber: incoming.number,
    incomingDate: incoming.date,
    registrationNumber: registration.number,
    registrationDate: registration.date,
    ownerName: readOwnerName(attrs),
  }
}
