export type CasePartyRow = {
  legalName?: string
  city?: string
  postalCode?: string
  country?: string
  address?: string
  lawyerLegalName?: string
}

export type CaseEventRow = {
  id: string
  date?: string
  deadline?: string
  regarding?: string
  info?: string
}

export type CaseInstanceRow = {
  id: string
  caseNumber?: string
  instance?: string
  court?: string
  panel?: string
  division?: string
}

export const CASE_STATUS_VALUES = [
  'suspended',
  'scheduled',
  'inactive',
  'appealed',
] as const

export type CaseStatusValue = (typeof CASE_STATUS_VALUES)[number]

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readPartyRows(value: unknown): CasePartyRow[] {
  if (!Array.isArray(value)) return []
  const rows: CasePartyRow[] = []
  for (const row of value) {
    const item = asRecord(row)
    if (!item) continue
    rows.push({
      legalName: readString(item.legalName) ?? undefined,
      city: readString(item.city) ?? undefined,
      postalCode: readString(item.postalCode) ?? undefined,
      country: readString(item.country) ?? undefined,
      address: readString(item.address) ?? undefined,
      lawyerLegalName: readString(item.lawyerLegalName) ?? undefined,
    })
  }
  return rows
}

function readEvents(value: unknown): CaseEventRow[] {
  if (!Array.isArray(value)) return []
  const rows: CaseEventRow[] = []
  value.forEach((row, index) => {
    const item = asRecord(row)
    if (!item) return
    rows.push({
      id: readString(item.id) ?? `event-${index}`,
      date: readString(item.date) ?? undefined,
      deadline: readString(item.deadline) ?? undefined,
      regarding: readString(item.regarding) ?? undefined,
      info: readString(item.info) ?? undefined,
    })
  })
  return rows
}

function readInstances(value: unknown): CaseInstanceRow[] {
  if (!Array.isArray(value)) return []
  const rows: CaseInstanceRow[] = []
  value.forEach((row, index) => {
    const item = asRecord(row)
    if (!item) return
    rows.push({
      id: readString(item.id) ?? `instance-${index}`,
      caseNumber: readString(item.caseNumber) ?? undefined,
      instance: readString(item.instance) ?? undefined,
      court: readString(item.court) ?? undefined,
      panel: readString(item.panel) ?? undefined,
      division: readString(item.division) ?? undefined,
    })
  })
  return rows
}

export function readCaseFields(attrs: Record<string, unknown>) {
  const caseClientRole = readString(attrs.caseClientRole) as
    | 'plaintiff'
    | 'defendant'
    | 'interested'
    | null

  return {
    caseClientRole,
    plaintiffs: readPartyRows(attrs.plaintiffs),
    defendants: readPartyRows(attrs.defendants),
    interestedParties: readPartyRows(attrs.interestedParties),
    court: readString(attrs.court),
    territory: readString(attrs.territory),
    authority: readString(attrs.authority),
    panel: readString(attrs.panel),
    division: readString(attrs.division),
    incomingNumber: readString(attrs.incomingNumber),
    incomingNumber2: readString(attrs.incomingNumber2),
    isIncoming: attrs.isIncoming === true,
    claimGrounds: readString(attrs.claimGrounds),
    claimValue: readString(attrs.claimValue),
    rightObject: readString(attrs.rightObject),
    rightName: readString(attrs.rightName),
    rightApplicationNumber: readString(attrs.rightApplicationNumber),
    rightApplicationDate: readString(attrs.rightApplicationDate),
    rightScope: readString(attrs.rightScope),
    rightOwner: readString(attrs.rightOwner),
    rightsOther: attrs.rightsOther === true,
    expertiseType: readString(attrs.expertiseType),
    experts: readString(attrs.experts),
    expertiseQuestions: readString(attrs.expertiseQuestions),
    additionalInfo: readString(attrs.additionalInfo),
    caseStatus: readString(attrs.caseStatus) as CaseStatusValue | null,
    scheduledDate: readString(attrs.scheduledDate),
    caseEvents: readEvents(attrs.caseEvents),
    caseInstances: readInstances(attrs.caseInstances),
    clientLegalName: readString(attrs.clientLegalName),
  }
}

export function partyNames(rows: CasePartyRow[]): string[] {
  return rows
    .map((row) => row.legalName?.trim())
    .filter((name): name is string => Boolean(name))
}

export function lawyerNames(rows: CasePartyRow[]): string[] {
  return rows
    .map((row) => row.lawyerLegalName?.trim())
    .filter((name): name is string => Boolean(name))
}

export function formatPartyBlock(
  rows: CasePartyRow[],
  emptyLabel = '—',
): { parties: string; lawyers: string } {
  const names = partyNames(rows)
  const lawyers = lawyerNames(rows)
  return {
    parties: names.length > 0 ? names.join('\n') : emptyLabel,
    lawyers: lawyers.length > 0 ? lawyers.join('\n') : emptyLabel,
  }
}

export function resolveOpposingPartyName(
  fields: ReturnType<typeof readCaseFields>,
  clientName: string,
): string | null {
  const { caseClientRole, plaintiffs, defendants } = fields
  const plaintiffNames = partyNames(plaintiffs)
  const defendantNames = partyNames(defendants)

  if (caseClientRole === 'plaintiff') {
    return defendantNames[0] ?? null
  }
  if (caseClientRole === 'defendant') {
    return plaintiffNames[0] ?? null
  }
  if (caseClientRole === 'interested') {
    return plaintiffNames[0] ?? defendantNames[0] ?? null
  }

  if (plaintiffNames[0] && defendantNames[0]) {
    const clientUpper = clientName.trim().toUpperCase()
    if (plaintiffNames[0].toUpperCase() === clientUpper) return defendantNames[0]
    if (defendantNames[0].toUpperCase() === clientUpper) return plaintiffNames[0]
    return defendantNames[0]
  }

  return defendantNames[0] ?? plaintiffNames[0] ?? null
}

export function formatCaseNumber(fields: ReturnType<typeof readCaseFields>): string {
  const primary = fields.incomingNumber ?? fields.incomingNumber2
  if (!primary) return '—'
  if (fields.isIncoming || fields.incomingNumber2) {
    return `${primary} (${'incoming'})`
  }
  return primary
}

export function formatCourtLabel(fields: ReturnType<typeof readCaseFields>): string {
  const parts = [fields.court, fields.authority].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '—'
}

export function appendCaseEvent(
  attrs: Record<string, unknown>,
  event: Omit<CaseEventRow, 'id'> & { id?: string },
): Record<string, unknown> {
  const existing = readEvents(attrs.caseEvents)
  const next: CaseEventRow = {
    id: event.id ?? `event-${Date.now()}`,
    date: event.date,
    deadline: event.deadline,
    regarding: event.regarding,
    info: event.info,
  }
  return {
    ...attrs,
    caseEvents: [...existing, next],
  }
}
