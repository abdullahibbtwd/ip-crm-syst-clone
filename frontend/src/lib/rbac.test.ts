import { describe, expect, it } from 'vitest'
import {
  SYSTEM_ROLES,
  canViewGdprCompliance,
  hasAnyRole,
  hasRole,
  initials,
  isPortalUser,
  resolvePrimaryRole,
} from './rbac'

describe('rbac helpers', () => {
  it('hasRole checks exact membership', () => {
    expect(hasRole([SYSTEM_ROLES.FINANCE], SYSTEM_ROLES.FINANCE)).toBe(true)
    expect(hasRole([SYSTEM_ROLES.FINANCE], SYSTEM_ROLES.IT_ADMIN)).toBe(false)
  })

  it('hasAnyRole matches when any candidate is present', () => {
    expect(
      hasAnyRole([SYSTEM_ROLES.PARALEGAL], [
        SYSTEM_ROLES.FINANCE,
        SYSTEM_ROLES.PARALEGAL,
      ]),
    ).toBe(true)
    expect(
      hasAnyRole([SYSTEM_ROLES.PARALEGAL], [SYSTEM_ROLES.FINANCE]),
    ).toBe(false)
  })

  it('canViewGdprCompliance allows DPO and managing partner', () => {
    expect(canViewGdprCompliance([SYSTEM_ROLES.DPO_COMPLIANCE])).toBe(true)
    expect(canViewGdprCompliance([SYSTEM_ROLES.MANAGING_PARTNER])).toBe(true)
    expect(canViewGdprCompliance([SYSTEM_ROLES.PARALEGAL])).toBe(false)
  })

  it('resolvePrimaryRole prefers higher-priority roles', () => {
    expect(
      resolvePrimaryRole([
        SYSTEM_ROLES.PARALEGAL,
        SYSTEM_ROLES.MANAGING_PARTNER,
      ]),
    ).toBe(SYSTEM_ROLES.MANAGING_PARTNER)
  })

  it('initials takes up to two uppercase letters', () => {
    expect(initials('Ada Lovelace')).toBe('AL')
    expect(initials('  single  ')).toBe('S')
  })

  it('isPortalUser requires portal_client alone', () => {
    expect(isPortalUser([SYSTEM_ROLES.PORTAL_CLIENT])).toBe(true)
    expect(
      isPortalUser([SYSTEM_ROLES.PORTAL_CLIENT, SYSTEM_ROLES.PARALEGAL]),
    ).toBe(false)
  })
})
