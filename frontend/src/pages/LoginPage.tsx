import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, KeyRound, Loader2, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { loginRequest, verifyMfaRequest } from '../features/auth/api'
import { useAuth } from '../features/auth/AuthProvider'
import {
  loginSchema,
  mfaVerifySchema,
  type LoginFormData,
  type MfaVerifyFormData,
} from '../features/auth/schemas'
import { AuthFooterLink, AuthLayout } from '../layouts/AuthLayout'
import { SsoButtons } from '../components/auth/SsoButtons'

function MfaStep({
  onSuccess,
}: {
  onSuccess: (user: import('../features/auth/types').AuthUser) => void
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<MfaVerifyFormData>({ defaultValues: { code: '' } })

  const mfaMutation = useMutation({
    mutationFn: verifyMfaRequest,
    onSuccess: (data) => onSuccess(data.user),
  })

  const onSubmit = handleSubmit((data) => {
    const parsed = mfaVerifySchema.safeParse(data)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError('code', { message: issue.message })
      }
      return
    }
    mfaMutation.mutate(parsed.data)
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {mfaMutation.isError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Invalid authentication code
        </div>
      )}

      <div className="rounded-lg border border-brand-green/10 bg-brand-light/50 px-4 py-3 text-sm text-brand-green/80">
        <KeyRound className="mb-1 inline h-4 w-4 text-brand-orange" /> Enter the
        6-digit code from your authenticator app.
      </div>

      <div>
        <label htmlFor="code" className="auth-label">
          Authentication code
        </label>
        <input
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="auth-input tracking-[0.3em]"
          placeholder="000000"
          {...register('code')}
        />
        {errors.code && <p className="auth-error">{errors.code.message}</p>}
      </div>

      <button
        type="submit"
        disabled={mfaMutation.isPending}
        className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {mfaMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying…
          </>
        ) : (
          'Verify & sign in'
        )}
      </button>
    </form>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { setUser } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [mfaStep, setMfaStep] = useState(false)
  const [ssoMfaPending, setSsoMfaPending] = useState(false)

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from
      ?.pathname ?? '/dashboard'

  const ssoError = searchParams.get('error')

  useEffect(() => {
    if (searchParams.get('mfa') === '1') {
      setMfaStep(true)
      setSsoMfaPending(true)
      window.history.replaceState({}, '', '/login')
      return
    }
    if (ssoError) {
      window.history.replaceState({}, '', '/login')
    }
  }, [searchParams, ssoError])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: { email: '', password: '' },
  })

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      if ('mfaRequired' in data && data.mfaRequired) {
        setMfaStep(true)
        return
      }
      if ('user' in data && data.user) {
        setUser(data.user)
        navigate(from, { replace: true })
      }
    },
  })

  const onSubmit = handleSubmit((data) => {
    const parsed = loginSchema.safeParse(data)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof LoginFormData
        setError(field, { message: issue.message })
      }
      return
    }
    loginMutation.mutate(parsed.data)
  })

  const apiError =
    loginMutation.error &&
    (loginMutation.error as { response?: { data?: { message?: string | string[] } } })
      .response?.data?.message

  const errorMessage =
    ssoError ??
    (Array.isArray(apiError)
      ? apiError.join(', ')
      : apiError ?? (loginMutation.isError ? 'Invalid email or password' : null))

  if (mfaStep) {
    return (
      <AuthLayout
        title="Two-factor authentication"
        subtitle={
          ssoMfaPending
            ? 'SSO sign-in succeeded. Enter the code from your authenticator app to finish.'
            : 'Enter the code from your authenticator app to continue.'
        }
        footer={<AuthFooterLink to="/login">Back to sign in</AuthFooterLink>}
      >
        <MfaStep
          onSuccess={(user) => {
            setUser(user)
            navigate(from, { replace: true })
          }}
        />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your IP matters, deadlines, and client workspace."
      footer={
        <AuthFooterLink to="/reset-password">Forgot your password?</AuthFooterLink>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        <div>
          <label htmlFor="email" className="auth-label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="auth-input"
            placeholder="you@ipconsulting.bg"
            {...register('email')}
          />
          {errors.email && (
            <p className="auth-error">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="auth-label mb-0">
              Password
            </label>
            <Link
              to="/reset-password"
              className="text-xs text-brand-green/60 transition-colors hover:text-brand-orange"
            >
              Reset password
            </Link>
          </div>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand-green/30"
              aria-hidden
            />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="auth-input pr-11 pl-10"
              placeholder="••••••••"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-brand-green/40 transition-colors hover:text-brand-orange"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="auth-error">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loginMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>

        <SsoButtons />
      </form>
    </AuthLayout>
  )
}
