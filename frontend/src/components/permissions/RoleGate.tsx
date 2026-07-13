import type { ReactNode } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { hasAnyRole, type SystemRole } from '@/lib/rbac'

type RoleGateProps = {
  roles: SystemRole[]
  children: ReactNode
  fallback?: ReactNode
}

/** Show children only when the user has at least one of the listed roles. */
export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { user } = useAuth()
  const allowed = hasAnyRole(user?.roles ?? [], roles)
  return allowed ? children : fallback
}
