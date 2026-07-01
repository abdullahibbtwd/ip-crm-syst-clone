import type { ClientStatus, ClientType } from './types'

export function clientDisplayName(client: {
  type: string
  companyName?: string | null
  firstName?: string | null
  lastName?: string | null
}): string {
  if (client.type === 'company' && client.companyName) return client.companyName
  return [client.firstName, client.lastName].filter(Boolean).join(' ').trim() || 'Unnamed client'
}

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

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  company: 'Company',
  individual: 'Individual',
}

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
