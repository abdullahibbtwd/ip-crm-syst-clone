import type { ReactNode } from 'react'
import { usePermission } from '@/hooks/usePermission'

type PermissionGateProps = {
  resource: string
  action: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGate({
  resource,
  action,
  children,
  fallback = null,
}: PermissionGateProps) {
  const allowed = usePermission(resource, action)
  return allowed ? children : fallback
}
