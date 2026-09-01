import { MatterType } from '../../generated/prisma/client';

export type OtherListSummary = {
  headline: string | null
  workflowStage: string | null
  incomingNumber: string | null
  incomingDate: string | null
  authorityOffice: string | null
  deadlineHint: string | null
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

const HEADLINE_KEYS: Partial<Record<MatterType, string[]>> = {
  copyright: ['workTitle'],
  border_measures: ['protectedRightRef', 'customsOffice'],
  fto_analysis: ['projectName', 'productName'],
  valuation: ['assetDescription'],
  dispute_opposition: ['opponentName', 'filingReference'],
  domain: ['domainName'],
  litigation_expert_report: ['caseReference'],
  consultation: ['topic'],
  official_fee_payment: ['feeReference', 'relatedApplication'],
  other: ['workSummary', 'workCategory'],
}

const DEADLINE_KEYS: Partial<Record<MatterType, string>> = {
  domain: 'expiryDate',
  official_fee_payment: 'paymentDeadline',
  fto_analysis: 'targetCompletionDate',
  litigation_expert_report: 'reportDueDate',
  border_measures: 'validUntil',
}

export function extractOtherListSummary(
  matterType: MatterType,
  rawAttributes: unknown,
): OtherListSummary | null {
  const attrs = asRecord(rawAttributes)
  if (!attrs) {
    return {
      headline: null,
      workflowStage: null,
      incomingNumber: null,
      incomingDate: null,
      authorityOffice: null,
      deadlineHint: null,
    }
  }

  const keys = HEADLINE_KEYS[matterType] ?? []
  let headline: string | null = null
  for (const key of keys) {
    headline = readString(attrs[key])
    if (headline) break
  }
  if (!headline) headline = readString(attrs.incomingNumber)

  const deadlineKey = DEADLINE_KEYS[matterType]
  const deadlineHint = deadlineKey ? readString(attrs[deadlineKey]) : null

  return {
    headline,
    workflowStage: readString(attrs.workflowStage),
    incomingNumber: readString(attrs.incomingNumber),
    incomingDate: readString(attrs.incomingDate),
    authorityOffice: readString(attrs.authorityOffice),
    deadlineHint,
  }
}
