import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'

const MFA_ENROLLMENT_ALLOWED = ['/settings', '/logout']

export function ProtectedRoute() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-light text-brand-green">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-green/20 border-t-brand-orange" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (
    user?.mfaEnrollmentRequired &&
    !MFA_ENROLLMENT_ALLOWED.some((path) => location.pathname.startsWith(path))
  ) {
    return <Navigate to="/settings?mfa=enroll" replace />
  }

  return <Outlet />
}

export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-light text-brand-green">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-green/20 border-t-brand-orange" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
