import {
  PROSECUTION_STAGES,
  type ProsecutionStage,
} from './trademark-list-summary.utils';

export type GiTerritoryRoute = 'national' | 'eu' | 'wo';

export type GiListSummary = {
  giTerritory: GiTerritoryRoute | null
  territoryCode: string | null
  prosecutionStage: ProsecutionStage | null
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

function readGiTerritory(attrs: Record<string, unknown>): GiTerritoryRoute | null {
  const route = attrs.giTerritory
  if (route === 'national' || route === 'eu' || route === 'wo') return route
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

function readGoodsClassification(attrs: Record<string, unknown>): string | null {
  const goods = attrs.goodsAndServices
  if (Array.isArray(goods)) {
    const parts = goods
      .map((row) => {
        const item = asRecord(row)
        if (!item) return null
        const number = readString(item.number)
        return number ? `${number},` : null
      })
      .filter((c): c is string => Boolean(c))
    if (parts.length > 0) return parts.join(' ')
  }

  const summary = readString(attrs.goodsSummary)
  if (summary) {
    const firstLine = summary.split('\n')[0]?.trim()
    if (firstLine) return firstLine
  }

  return null
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

export function extractGiListSummary(
  rawAttributes: unknown,
  ipRight: IpRightRegistrationSlice = null,
  options?: { territoryCode?: string | null },
): GiListSummary {
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
      giTerritory: null,
      territoryCode: options?.territoryCode ?? null,
      prosecutionStage: null,
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
  const prosecutionStage = readProsecutionStage(attrs)

  return {
    giTerritory: readGiTerritory(attrs),
    territoryCode: options?.territoryCode ?? null,
    prosecutionStage,
    classification: readGoodsClassification(attrs),
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
