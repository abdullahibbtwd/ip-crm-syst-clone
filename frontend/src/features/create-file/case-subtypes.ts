export const CASE_CLIENT_ROLES = [
  'plaintiff',
  'defendant',
  'interested',
] as const

export type CaseClientRole = (typeof CASE_CLIENT_ROLES)[number]

export type CasePartyKind = CaseClientRole

export type CaseSectionTone = 'us' | 'them' | 'third' | 'case'

export function normalizeCaseClientRole(
  value: string | null | undefined,
): CaseClientRole | null {
  if (value === 'plaintiff' || value === 'defendant' || value === 'interested') {
    return value
  }
  return null
}

/** Our side is green, opposing side is red, third party is yellow. */
export function casePartyTone(
  clientRole: CaseClientRole | null,
  party: CasePartyKind,
): CaseSectionTone {
  if (!clientRole) {
    if (party === 'plaintiff') return 'us'
    if (party === 'defendant') return 'them'
    return 'third'
  }
  if (clientRole === party) return 'us'
  if (party === 'interested') return 'third'
  return 'them'
}

export type CasePartyDraft = {
  id: string
  legalName: string
  city: string
  postalCode: string
  country: string
  address: string
  lawyerLegalName: string
}
