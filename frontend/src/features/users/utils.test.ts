import { describe, expect, it } from 'vitest'
import {
  assigneeRoleLabel,
  formatAssigneeOption,
  formatJoined,
  formatLastLogin,
  formatUserRole,
  roleBadgeVariant,
} from './utils'

describe('user utils', () => {
  it('assigneeRoleLabel prefers trademark, IP, then managing partner', () => {
    expect(assigneeRoleLabel(['paralegal', 'ip_attorney'])).toBe('IP Attorney')
    expect(assigneeRoleLabel(['trademark_attorney', 'ip_attorney'])).toBe(
      'Trademark Attorney',
    )
    expect(assigneeRoleLabel(['managing_partner'])).toBe('Managing Partner')
    expect(assigneeRoleLabel(['finance'])).toBe('finance')
  })

  it('formatAssigneeOption combines name and role label', () => {
    expect(
      formatAssigneeOption({
        id: 'u1',
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        roles: ['ip_attorney'],
      }),
    ).toBe('Ada Lovelace - IP Attorney')
  })

  it('formatUserRole uses known role labels', () => {
    expect(formatUserRole('finance')).toBe('Finance')
    expect(formatUserRole('custom_role')).toBe('custom role')
  })

  it('roleBadgeVariant maps staff roles to badge styles', () => {
    expect(roleBadgeVariant('managing_partner')).toBe('default')
    expect(roleBadgeVariant('finance')).toBe('success')
    expect(roleBadgeVariant('paralegal')).toBe('outline')
  })

  it('formatLastLogin handles null and invalid values', () => {
    expect(formatLastLogin(null)).toBe('Never')
    expect(formatLastLogin('not-a-date')).toBe('-')
  })

  it('formatJoined handles invalid dates', () => {
    expect(formatJoined('invalid')).toBe('-')
  })
})
