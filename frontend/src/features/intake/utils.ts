import type { ConflictHit, CounterpartyRelationship, IntakeLead } from './types'

export function intakeDisplayName(lead: Pick<IntakeLead, 'enquirerType' | 'companyName' | 'fullName'>) {
  if (lead.enquirerType === 'company') return lead.companyName ?? 'Unknown company'
  return lead.fullName ?? 'Unknown individual'
}

export const INTAKE_STATUS_LABELS: Record<IntakeLead['status'], string> = {
  new: 'New',
  reviewing: 'Reviewing',
  conflict_check: 'Conflict check',
  conflict_flagged: 'Conflict flagged',
  approved: 'Approved',
  rejected: 'Rejected',
  converted: 'Converted',
}

export const INTAKE_STATUS_BADGE_VARIANT: Record<
  IntakeLead['status'],
  'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info'
> = {
  new: 'info',
  reviewing: 'secondary',
  conflict_check: 'warning',
  conflict_flagged: 'destructive',
  approved: 'success',
  rejected: 'destructive',
  converted: 'success',
}

export function formatIntakeDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatIntakeDateTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export const MATTER_TYPE_LABELS: Record<IntakeLead['matterType'], string> = {
  trademark: 'Trademark',
  patent: 'Patent',
  utility_model: 'Utility model',
  design: 'Design',
  other: 'Other',
}

export const REFERRAL_SOURCE_LABELS: Record<IntakeLead['referralSource'], string> = {
  email: 'Email',
  phone: 'Phone',
  referral: 'Referral',
  walk_in: 'Walk-in',
  website: 'Website',
  other: 'Other',
}

export const COUNTERPARTY_RELATIONSHIP_LABELS: Record<CounterpartyRelationship, string> = {
  competitor: 'Competitor',
  adverse_party: 'Adverse party',
  licensor: 'Licensor',
  licensee: 'Licensee',
}

export const CONFLICT_ENTITY_LABELS: Record<ConflictHit['entityType'], string> = {
  client: 'Client',
  contact: 'Contact',
  related_company: 'Related company',
  counterparty: 'Counterparty',
  matter: 'Existing matter',
  ip_right: 'IP right / trademark register',
  sign: 'Sign / mark on file',
}

export function formatSimilarity(score: number) {
  return `${Math.round(score * 100)}%`
}

export function groupConflictHits(hits: ConflictHit[]) {
  const groups = new Map<ConflictHit['entityType'], ConflictHit[]>()
  for (const hit of hits) {
    const list = groups.get(hit.entityType) ?? []
    list.push(hit)
    groups.set(hit.entityType, list)
  }
  return groups
}
