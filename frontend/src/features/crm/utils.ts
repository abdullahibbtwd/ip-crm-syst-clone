import i18n from '@/i18n'
import type { ClientStatus, ClientType } from './types'

export function clientDisplayName(client: {
  type: string
  companyName?: string | null
  firstName?: string | null
  lastName?: string | null
}): string {
  if (client.type === 'company' && client.companyName) return client.companyName
  return (
    [client.firstName, client.lastName].filter(Boolean).join(' ').trim() ||
    i18n.t('unnamedClient', { ns: 'crm' })
  )
}

export function clientStatusLabel(status: ClientStatus): string {
  return i18n.t(`status.${status}`, { ns: 'crm' })
}

export function clientTypeLabel(type: ClientType): string {
  return i18n.t(`type.${type}`, { ns: 'crm' })
}

export function relationshipTypeLabel(
  type: 'subsidiary' | 'affiliate' | 'parent',
): string {
  return i18n.t(`relationship.${type}`, { ns: 'crm' })
}

/** @deprecated Use clientStatusLabel() for translated labels */
export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Active',
  prospect: 'Prospect',
  inactive: 'Inactive',
  archived: 'Archived',
}

export const CLIENT_STATUS_BADGE_VARIANT: Record<
  ClientStatus,
  'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info'
> = {
  active: 'success',
  prospect: 'warning',
  inactive: 'outline',
  archived: 'secondary',
}

/** @deprecated Use clientTypeLabel() for translated labels */
export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  company: 'Company',
  individual: 'Individual',
}

/** @deprecated Use relationshipTypeLabel() for translated labels */
export const RELATIONSHIP_TYPE_LABELS: Record<
  'subsidiary' | 'affiliate' | 'parent',
  string
> = {
  subsidiary: 'Subsidiary',
  affiliate: 'Affiliate',
  parent: 'Parent',
}

export function formatCrmDateTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
