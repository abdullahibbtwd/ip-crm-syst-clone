import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@/features/auth/types'
import { useAnyPermission, usePermission } from './usePermission'

const useAuthMock = vi.fn()

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => useAuthMock(),
}))

function authUser(permissions: string[]): AuthUser {
  return {
    id: 'u1',
    email: 'user@example.com',
    fullName: 'Test User',
    clientId: null,
    roles: ['paralegal'],
    permissions,
    mfaEnabled: false,
  }
}

describe('usePermission', () => {
  beforeEach(() => {
    useAuthMock.mockReset()
  })

  it('returns true when the user has resource:action permission', () => {
    useAuthMock.mockReturnValue({
      user: authUser(['clients:read', 'matters:write']),
    })

    const { result } = renderHook(() => usePermission('clients', 'read'))
    expect(result.current).toBe(true)
  })

  it('returns false when permission is missing or user is null', () => {
    useAuthMock.mockReturnValue({ user: authUser(['clients:read']) })
    const missing = renderHook(() => usePermission('clients', 'write'))
    expect(missing.result.current).toBe(false)

    useAuthMock.mockReturnValue({ user: null })
    const loggedOut = renderHook(() => usePermission('clients', 'read'))
    expect(loggedOut.result.current).toBe(false)
  })
})

describe('useAnyPermission', () => {
  beforeEach(() => {
    useAuthMock.mockReset()
  })

  it('returns true when any permission key matches', () => {
    useAuthMock.mockReturnValue({
      user: authUser(['reports:read']),
    })

    const { result } = renderHook(() =>
      useAnyPermission('reports:read', 'reports:export'),
    )
    expect(result.current).toBe(true)
  })

  it('returns false when no keys match or user is absent', () => {
    useAuthMock.mockReturnValue({
      user: authUser(['clients:read']),
    })

    const { result } = renderHook(() =>
      useAnyPermission('reports:read', 'reports:export'),
    )
    expect(result.current).toBe(false)

    useAuthMock.mockReturnValue({ user: null })
    const loggedOut = renderHook(() => useAnyPermission('clients:read'))
    expect(loggedOut.result.current).toBe(false)
  })
})
