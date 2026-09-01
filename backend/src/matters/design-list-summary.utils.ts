import {
  PROSECUTION_STAGES,
  type ProsecutionStage,
} from './trademark-list-summary.utils'

export type DesignFilingRoute = 'wipo' | 'national' | 'euipo'

export type DesignListSummary = {
  designProcedure: DesignFilingRoute | null
  territoryCode: string | null
  prosecutionStage: ProsecutionStage | null
  /** Locarno class-subclass display, e.g. "4-3". */
  locarnoClass: string | null
  locarnoSubclass: string | null
  classification: string | null
  incomingNumber: string | null
  incomingDate: string | null
  registrationNumber: string | null
  registrationDate: string | null
  ownerName: string | null
  isRegistered: boolean
}

type IpRightRegistrationSlice = {
  applicationNumber: string | null
  registrationNumber: string | null
  filingDate: Date | null
  registrationDate: Date | null
  status?: string | null
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

function readDesignProcedure(
  attrs: Record<string, unknown>,
): DesignFilingRoute | null {
  const route = attrs.designProcedure
  if (route === 'wipo' || route === 'national' || route === 'euipo') {
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

function readOwnerName(attrs: Record<string, unknown>): string | null {
  if (attrs.ownerSameAsClient === true) return null
  return readString(attrs.ownerLegalName)
}

function readLocarnoParts(attrs: Record<string, unknown>): {
  locarnoClass: string | null
  locarnoSubclass: string | null
  classification: string | null
} {
  const classNumber = readString(attrs.locarnoClassNumber)
  const subclass = readString(attrs.locarnoSubclass)
  const combined = readString(attrs.locarnoClass)

  if (classNumber && subclass) {
    return {
      locarnoClass: classNumber,
      locarnoSubclass: subclass,
      classification: `${classNumber}-${subclass}`,
    }
  }

  if (combined) {
    const dash = combined.indexOf('-')
    if (dash > 0) {
      return {
        locarnoClass: combined.slice(0, dash),
        locarnoSubclass: combined.slice(dash + 1),
        classification: combined,
      }
    }
    return {
      locarnoClass: combined,
      locarnoSubclass: subclass,
      classification: subclass ? `${combined}-${subclass}` : combined,
    }
  }

  return {
    locarnoClass: classNumber,
    locarnoSubclass: subclass,
    classification:
      classNumber && subclass
        ? `${classNumber}-${subclass}`
        : classNumber ?? subclass,
  }
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

function resolveIsRegistered(
  attrs: Record<string, unknown>,
  ipRight: IpRightRegistrationSlice,
  registrationNumber: string | null,
  prosecutionStage: ProsecutionStage | null,
): boolean {
  if (prosecutionStage === 'registration') return true
  if (registrationNumber) return true
  if (ipRight?.status === 'registered') return true
  return Boolean(readString(attrs.registrationNumber))
}

/**
 * Builds design portfolio row fields from matter attributes and optional primary IP right.
 */
export function extractDesignListSummary(
  rawAttributes: unknown,
  ipRight: IpRightRegistrationSlice = null,
  options?: { territoryCode?: string | null },
): DesignListSummary {
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

    const regNumber = ipRight?.registrationNumber ?? null
    const regDate = ipRight?.registrationDate
      ? ipRight.registrationDate.toISOString().slice(0, 10)
      : null

    return {
      designProcedure: null,
      territoryCode: options?.territoryCode ?? null,
      prosecutionStage: null,
      locarnoClass: null,
      locarnoSubclass: null,
      classification: null,
      incomingNumber: incomingFromIp.number,
      incomingDate: incomingFromIp.date,
      registrationNumber: regNumber,
      registrationDate: regDate,
      ownerName: null,
      isRegistered: Boolean(regNumber) || ipRight?.status === 'registered',
    }
  }

  const incoming = resolveIncomingRef(attrs, ipRight)
  const registration = resolveRegistration(attrs, ipRight)
  const locarno = readLocarnoParts(attrs)
  const prosecutionStage = readProsecutionStage(attrs)

  return {
    designProcedure: readDesignProcedure(attrs),
    territoryCode: options?.territoryCode ?? null,
    prosecutionStage,
    locarnoClass: locarno.locarnoClass,
    locarnoSubclass: locarno.locarnoSubclass,
    classification: locarno.classification,
    incomingNumber: incoming.number,
    incomingDate: incoming.date,
    registrationNumber: registration.number,
    registrationDate: registration.date,
    ownerName: readOwnerName(attrs),
    isRegistered: resolveIsRegistered(
      attrs,
      ipRight,
      registration.number,
      prosecutionStage,
    ),
  }
}
