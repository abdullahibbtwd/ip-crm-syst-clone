import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_ROLES } from '@/lib/rbac'
import type { AuthUser } from '@/features/auth/types'
import { RoleGate } from './RoleGate'

const useAuthMock = vi.fn()

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => useAuthMock(),
}))

function authValue(roles: string[]) {
  const user: AuthUser = {
    id: 'u1',
    email: 'user@example.com',
    fullName: 'Test User',
    clientId: null,
    roles,
    permissions: [],
    mfaEnabled: false,
  }
  return {
    user,
    isLoading: false,
    isAuthenticated: true,
    setUser: vi.fn(),
    logout: vi.fn(),
  }
}

describe('RoleGate', () => {
  beforeEach(() => {
    useAuthMock.mockReset()
  })

  it('renders children when the user has a required role', () => {
    useAuthMock.mockReturnValue(authValue([SYSTEM_ROLES.MANAGING_PARTNER]))

    render(
      <RoleGate roles={[SYSTEM_ROLES.MANAGING_PARTNER]}>
        <span>Secret</span>
      </RoleGate>,
    )

    expect(screen.getByText('Secret')).toBeInTheDocument()
  })

  it('renders fallback when the user lacks the role', () => {
    useAuthMock.mockReturnValue(authValue([SYSTEM_ROLES.PARALEGAL]))

    render(
      <RoleGate
        roles={[SYSTEM_ROLES.FINANCE]}
        fallback={<span>Denied</span>}
      >
        <span>Secret</span>
      </RoleGate>,
    )

    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
    expect(screen.getByText('Denied')).toBeInTheDocument()
  })
})
