import { ROLE_LABELS, SYSTEM_ROLES, type SystemRole } from '@/lib/rbac'

export type AttorneyAssignee = {
  id: string
  fullName: string
  email: string
  roles: string[]
}

/** Staff roles assignable from the Users admin UI (excludes portal_client). */
export const TEAM_ASSIGNABLE_ROLES = [
  SYSTEM_ROLES.MANAGING_PARTNER,
  SYSTEM_ROLES.IP_ATTORNEY,
  SYSTEM_ROLES.TRADEMARK_ATTORNEY,
  SYSTEM_ROLES.COORDINATOR,
  SYSTEM_ROLES.DOCKETING_ADMIN,
  SYSTEM_ROLES.PARALEGAL,
  SYSTEM_ROLES.FINANCE,
  SYSTEM_ROLES.DPO_COMPLIANCE,
  SYSTEM_ROLES.IT_ADMIN,
] as const satisfies readonly SystemRole[]

export type TeamAssignableRole = (typeof TEAM_ASSIGNABLE_ROLES)[number]

const ATTORNEY_ROLE_LABELS: Record<string, string> = {
  ip_attorney: 'IP Attorney',
  trademark_attorney: 'Trademark Attorney',
  managing_partner: 'Managing Partner',
}

export function assigneeRoleLabel(roles: string[]) {
  if (roles.includes('trademark_attorney'))
    return ATTORNEY_ROLE_LABELS.trademark_attorney
  if (roles.includes('ip_attorney')) return ATTORNEY_ROLE_LABELS.ip_attorney
  if (roles.includes('managing_partner'))
    return ATTORNEY_ROLE_LABELS.managing_partner
  return roles[0] ?? 'Attorney'
}

export function formatAssigneeOption(assignee: AttorneyAssignee) {
  return `${assignee.fullName} - ${assigneeRoleLabel(assignee.roles)}`
}

export function formatUserRole(role: string): string {
  return ROLE_LABELS[role as SystemRole] ?? role.replace(/_/g, ' ')
}

export function roleBadgeVariant(
  role: string,
): 'default' | 'secondary' | 'info' | 'warning' | 'success' | 'outline' {
  switch (role) {
    case 'managing_partner':
      return 'default'
    case 'it_admin':
    case 'dpo_compliance':
      return 'warning'
    case 'ip_attorney':
    case 'trademark_attorney':
      return 'info'
    case 'finance':
      return 'success'
    case 'portal_client':
      return 'secondary'
    default:
      return 'outline'
  }
}

export function formatLastLogin(iso: string | null): string {
  if (!iso) return 'Never'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatJoined(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' })
}
