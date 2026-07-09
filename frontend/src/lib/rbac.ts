export const SYSTEM_ROLES = {
  MANAGING_PARTNER: 'managing_partner',
  IP_ATTORNEY: 'ip_attorney',
  TRADEMARK_ATTORNEY: 'trademark_attorney',
  COORDINATOR: 'coordinator',
  DOCKETING_ADMIN: 'docketing_admin',
  PARALEGAL: 'paralegal',
  FINANCE: 'finance',
  DPO_COMPLIANCE: 'dpo_compliance',
  IT_ADMIN: 'it_admin',
  PORTAL_CLIENT: 'portal_client',
} as const

import i18n from '@/i18n'

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES]

export function roleLabel(role: SystemRole): string {
  return i18n.t(`roles.${role}`, { ns: 'nav', defaultValue: ROLE_LABELS[role] })
}

export const ROLE_LABELS: Record<SystemRole, string> = {
  managing_partner: 'Managing Partner',
  ip_attorney: 'IP / Patent Attorney',
  trademark_attorney: 'Trademark Attorney',
  coordinator: 'Coordinator / Intake',
  docketing_admin: 'Docketing Admin',
  paralegal: 'Paralegal',
  finance: 'Finance',
  dpo_compliance: 'DPO / Compliance',
  it_admin: 'IT / Admin',
  portal_client: 'Client (portal)',
}

const ROLE_PRIORITY: SystemRole[] = [
  'managing_partner',
  'it_admin',
  'dpo_compliance',
  'finance',
  'docketing_admin',
  'coordinator',
  'ip_attorney',
  'trademark_attorney',
  'paralegal',
  'portal_client',
]

export function hasRole(roles: string[], role: SystemRole): boolean {
  return roles.includes(role)
}

export function canViewGdprCompliance(roles: string[]): boolean {
  return hasRole(roles, SYSTEM_ROLES.DPO_COMPLIANCE) || hasRole(roles, SYSTEM_ROLES.MANAGING_PARTNER)
}

export function hasAnyRole(roles: string[], candidates: SystemRole[]): boolean {
  return candidates.some((r) => roles.includes(r))
}

export function resolvePrimaryRole(roles: string[]): SystemRole {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role
  }
  return (roles[0] as SystemRole) ?? 'paralegal'
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function isPortalUser(roles: string[]): boolean {
  return roles.includes('portal_client') && roles.length === 1
}
