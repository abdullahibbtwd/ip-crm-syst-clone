import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PermissionGate } from './PermissionGate'

const usePermissionMock = vi.fn()

vi.mock('@/hooks/usePermission', () => ({
  usePermission: (...args: unknown[]) => usePermissionMock(...args),
}))

describe('PermissionGate', () => {
  beforeEach(() => {
    usePermissionMock.mockReset()
  })

  it('renders children when permission is granted', () => {
    usePermissionMock.mockReturnValue(true)

    render(
      <PermissionGate resource="clients" action="read">
        <span>Allowed</span>
      </PermissionGate>,
    )

    expect(usePermissionMock).toHaveBeenCalledWith('clients', 'read')
    expect(screen.getByText('Allowed')).toBeInTheDocument()
  })

  it('renders fallback when permission is denied', () => {
    usePermissionMock.mockReturnValue(false)

    render(
      <PermissionGate
        resource="clients"
        action="write"
        fallback={<span>Denied</span>}
      >
        <span>Allowed</span>
      </PermissionGate>,
    )

    expect(screen.queryByText('Allowed')).not.toBeInTheDocument()
    expect(screen.getByText('Denied')).toBeInTheDocument()
  })
})
