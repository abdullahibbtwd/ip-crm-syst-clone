import { useAuth } from '@/features/auth/AuthProvider'

export function usePermission(resource: string, action: string): boolean {
  const { user } = useAuth()
  const key = `${resource}:${action}`
  return user?.permissions.includes(key) ?? false
}

export function useAnyPermission(...keys: string[]): boolean {
  const { user } = useAuth()
  if (!user) return false
  return keys.some((key) => user.permissions.includes(key))
}
