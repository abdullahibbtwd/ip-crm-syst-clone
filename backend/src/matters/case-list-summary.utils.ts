export type CaseListSummary = {
  clientName: string | null
  opposingPartyName: string | null
  caseNumber: string | null
  isIncoming: boolean
  courtLabel: string | null
  statusLabel: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readPartyNames(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((row) => {
      const item = asRecord(row)
      if (!item) return null
      return readString(item.legalName)
    })
    .filter((name): name is string => Boolean(name))
}

function resolveOpposingParty(
  attrs: Record<string, unknown>,
  ownerName: string | null,
): string | null {
  const role = readString(attrs.caseClientRole)
  const plaintiffs = readPartyNames(attrs.plaintiffs)
  const defendants = readPartyNames(attrs.defendants)

  if (role === 'plaintiff') return defendants[0] ?? null
  if (role === 'defendant') return plaintiffs[0] ?? null
  if (role === 'interested') return plaintiffs[0] ?? defendants[0] ?? null

  if (ownerName) {
    const ownerUpper = ownerName.toUpperCase()
    if (plaintiffs[0]?.toUpperCase() === ownerUpper) return defendants[0] ?? null
    if (defendants[0]?.toUpperCase() === ownerUpper) return plaintiffs[0] ?? null
  }

  return defendants[0] ?? plaintiffs[0] ?? null
}

function resolveCaseNumber(attrs: Record<string, unknown>): {
  caseNumber: string | null
  isIncoming: boolean
} {
  const incoming = readString(attrs.incomingNumber)
  const incoming2 = readString(attrs.incomingNumber2)
  const isIncoming = attrs.isIncoming === true || Boolean(incoming2 && !incoming)
  const caseNumber = incoming ?? incoming2
  return { caseNumber, isIncoming }
}

function resolveStatusLabel(attrs: Record<string, unknown>): string | null {
  const status = readString(attrs.caseStatus)
  if (status) return status
  return readString(attrs.claimGrounds)
}

export function extractCaseListSummary(
  rawAttributes: unknown,
  options?: {
    clientName?: string | null
    ownerName?: string | null
  },
): CaseListSummary {
  const attrs = asRecord(rawAttributes)
  if (!attrs) {
    return {
      clientName: options?.clientName ?? null,
      opposingPartyName: null,
      caseNumber: null,
      isIncoming: false,
      courtLabel: null,
      statusLabel: null,
    }
  }

  const clientName =
    options?.clientName ?? readString(attrs.clientLegalName) ?? options?.ownerName ?? null
  const { caseNumber, isIncoming } = resolveCaseNumber(attrs)
  const court = readString(attrs.court)
  const authority = readString(attrs.authority)

  return {
    clientName,
    opposingPartyName: resolveOpposingParty(attrs, clientName),
    caseNumber,
    isIncoming,
    courtLabel: [court, authority].filter(Boolean).join(', ') || null,
    statusLabel: resolveStatusLabel(attrs),
  }
}
