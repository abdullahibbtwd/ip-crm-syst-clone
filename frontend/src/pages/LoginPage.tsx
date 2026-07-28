import { useMutation } from '@tanstack/react-query'
import { ClientAddressFields } from '@/components/crm/ClientAddressFields'
import {
  emptyClientAddressInput,
  toClientAddressPayload,
} from '@/features/crm/addressInput'
import { Eye, EyeOff, KeyRound, Loader2, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { loginRequest, registerRequest, verifyMfaRequest } from '../features/auth/api'
import { useAuth } from '../features/auth/AuthProvider'
import {
  loginSchema,
  mfaVerifySchema,
  registerSchema,
  type LoginFormData,
  type MfaVerifyFormData,
  type RegisterFormData,
} from '../features/auth/schemas'
import { AuthFooterLink, AuthLayout } from '../layouts/AuthLayout'
import { SsoButtons } from '../components/auth/SsoButtons'

function MfaStep({
  onSuccess,
}: {
  onSuccess: (user: import('../features/auth/types').AuthUser) => void
}) {
  const { t } = useTranslation(['auth', 'common'])
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
        setError('code', { message: t(issue.message) })
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
          {t('mfa.invalidCode')}
        </div>
      )}

      <div className="rounded-lg border border-brand-green/10 bg-brand-light/50 px-4 py-3 text-sm text-brand-green/80">
        <KeyRound className="mb-1 inline h-4 w-4 text-brand-orange" /> {t('mfa.hint')}
      </div>
      <p className="text-xs text-muted-foreground">
        Lost your device? Enter a backup code (format XXXX-XXXX) instead.
      </p>

      <div>
        <label htmlFor="code" className="auth-label">
          {t('mfa.codeLabel')}
        </label>
        <input
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="auth-input tracking-[0.3em]"
          placeholder={t('mfa.codePlaceholder')}
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
            {t('mfa.verifying')}
          </>
        ) : (
          t('mfa.verifyAndSignIn')
        )}
      </button>
    </form>
  )
}

function SignupForm({
  onSuccess,
  errorMessage,
}: {
  onSuccess: (user: import('../features/auth/types').AuthUser) => void
  errorMessage: string | null
}) {
  const { t } = useTranslation(['auth', 'crm', 'common'])
  const [showPassword, setShowPassword] = useState(false)
  const [registeredLegalAddress, setRegisteredLegalAddress] = useState(
    emptyClientAddressInput(),
  )
  const [correspondenceAddress, setCorrespondenceAddress] = useState(
    emptyClientAddressInput(),
  )

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
      gdprConsent: false,
    },
  })

  const registerMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => onSuccess(data.user),
  })

  const onSubmit = handleSubmit((data) => {
    const parsed = registerSchema.safeParse(data)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof RegisterFormData
        if (field) setError(field, { message: t(issue.message) })
      }
      return
    }
    registerMutation.mutate({
      ...parsed.data,
      registeredLegalAddress: toClientAddressPayload(registeredLegalAddress),
      correspondenceAddress: toClientAddressPayload(correspondenceAddress),
    })
  })

  const apiError =
    registerMutation.error &&
    (registerMutation.error as { response?: { data?: { message?: string | string[] } } })
      .response?.data?.message

  const displayError =
    errorMessage ??
    (Array.isArray(apiError)
      ? apiError.join(', ')
      : apiError ?? (registerMutation.isError ? t('signup.couldNotCreateAccount') : null))

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {displayError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {displayError}
        </div>
      )}

      <div>
        <label htmlFor="fullName" className="auth-label">
          {t('signup.fullName')}
        </label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          className="auth-input"
          placeholder={t('signup.fullNamePlaceholder')}
          {...register('fullName')}
        />
        {errors.fullName && <p className="auth-error">{errors.fullName.message}</p>}
      </div>

      <div>
        <label htmlFor="signup-email" className="auth-label">
          {t('form.email')}
        </label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          className="auth-input"
          placeholder={t('signup.emailPlaceholder')}
          {...register('email')}
        />
        {errors.email && <p className="auth-error">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="companyName" className="auth-label">
          {t('signup.companyName')}{' '}
          <span className="text-brand-green/50">{t('signup.optional')}</span>
        </label>
        <input
          id="companyName"
          type="text"
          autoComplete="organization"
          className="auth-input"
          placeholder={t('signup.companyPlaceholder')}
          {...register('companyName')}
        />
        {errors.companyName && (
          <p className="auth-error">{errors.companyName.message}</p>
        )}
      </div>

      <div className="space-y-4 border-t border-brand-green/10 pt-4">
        <p className="text-sm font-medium text-brand-green">
          {t('signup.addressesTitle', { ns: 'auth' })}
          <span className="ml-1 text-brand-green/50">{t('signup.optional')}</span>
        </p>
        <ClientAddressFields
          idPrefix="registered"
          title={t('offices.addresses.registeredLegal', { ns: 'crm' })}
          value={registeredLegalAddress}
          onChange={setRegisteredLegalAddress}
          variant="auth"
        />
        <ClientAddressFields
          idPrefix="correspondence"
          title={t('offices.addresses.correspondence', { ns: 'crm' })}
          value={correspondenceAddress}
          onChange={setCorrespondenceAddress}
          variant="auth"
        />
      </div>

      <div>
        <label htmlFor="signup-password" className="auth-label">
          {t('form.password')}
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand-green/30"
            aria-hidden
          />
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="auth-input pr-11 pl-10"
            placeholder="••••••••"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-brand-green/40 transition-colors hover:text-brand-orange"
            aria-label={showPassword ? t('password.hide') : t('password.show')}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="auth-error">{errors.password.message}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="auth-label">
          {t('form.confirmPassword')}
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand-green/30"
            aria-hidden
          />
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="auth-input pr-11 pl-10"
            placeholder="••••••••"
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-brand-green/40 transition-colors hover:text-brand-orange"
            aria-label={showPassword ? t('password.hide') : t('password.show')}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="auth-error">{errors.confirmPassword.message}</p>
        )}
      </div>

      <label className="flex items-start gap-3 text-sm text-brand-green/80">
        <input
          type="checkbox"
          className="mt-1 size-4 rounded border-brand-green/20"
          {...register('gdprConsent')}
        />
        <span>{t('signup.gdprConsent')}</span>
      </label>
      {errors.gdprConsent && (
        <p className="auth-error">{errors.gdprConsent.message}</p>
      )}

      <button
        type="submit"
        disabled={registerMutation.isPending}
        className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {registerMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('signup.creatingAccount')}
          </>
        ) : (
          t('signup.createClientAccount')
        )}
      </button>

      <SsoButtons signup />
    </form>
  )
}

export function LoginPage() {
  const { t } = useTranslation(['auth', 'common'])
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { setUser } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [mfaStep, setMfaStep] = useState(false)
  const [ssoMfaPending, setSsoMfaPending] = useState(false)
  const [signupMode, setSignupMode] = useState(false)

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
    if (searchParams.get('signup') === '1') {
      setSignupMode(true)
    }
    if (ssoError || searchParams.get('signup') === '1') {
      const params = new URLSearchParams()
      if (searchParams.get('signup') === '1') params.set('signup', '1')
      if (ssoError) params.set('error', ssoError)
      const qs = params.toString()
      window.history.replaceState({}, '', qs ? `/login?${qs}` : '/login')
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
        setUser({
          ...data.user,
          mfaEnrollmentRequired: data.mfaEnrollmentRequired ?? data.user.mfaEnrollmentRequired,
        })
        if (data.mfaEnrollmentRequired) {
          navigate('/settings?mfa=enroll', { replace: true })
          return
        }
        navigate(from, { replace: true })
      }
    },
  })

  const onSubmit = handleSubmit((data) => {
    const parsed = loginSchema.safeParse(data)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof LoginFormData
        setError(field, { message: t(issue.message) })
      }
      return
    }
    loginMutation.mutate(parsed.data)
  })

  const apiError =
    loginMutation.error &&
    (loginMutation.error as { response?: { data?: { message?: string | string[] } } })
      .response?.data?.message

  const loginErrorMessage =
    !signupMode && ssoError
      ? ssoError
      : Array.isArray(apiError)
        ? apiError.join(', ')
        : apiError ?? (loginMutation.isError ? t('login.invalidCredentials') : null)

  const handleAuthSuccess = (user: import('../features/auth/types').AuthUser) => {
    setUser(user)
    navigate(from, { replace: true })
  }

  if (mfaStep) {
    return (
      <AuthLayout
        title={t('mfa.title')}
        subtitle={ssoMfaPending ? t('mfa.subtitleSso') : t('mfa.subtitle')}
        footer={
          <button
            type="button"
            className="nav-link font-medium text-brand-green"
            onClick={() => {
              setMfaStep(false)
              setSsoMfaPending(false)
            }}
          >
            {t('mfa.backToSignIn')}
          </button>
        }
      >
        <MfaStep onSuccess={handleAuthSuccess} />
      </AuthLayout>
    )
  }

  if (signupMode) {
    return (
      <AuthLayout
        title={t('signup.title')}
        subtitle={t('signup.subtitle')}
        footer={
          <button
            type="button"
            className="nav-link font-medium text-brand-green"
            onClick={() => {
              setSignupMode(false)
              window.history.replaceState({}, '', '/login')
            }}
          >
            {t('signup.alreadyHaveAccount')}
          </button>
        }
      >
        <SignupForm onSuccess={handleAuthSuccess} errorMessage={ssoError} />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      footer={
        <div className="space-y-3">
          <AuthFooterLink to="/reset-password">{t('login.forgotPassword')}</AuthFooterLink>
          <p className="text-brand-green/60">
            {t('login.newClient')}{' '}
            <button
              type="button"
              className="font-medium text-brand-green hover:text-brand-orange"
              onClick={() => setSignupMode(true)}
            >
              {t('login.createAccount')}
            </button>
          </p>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {loginErrorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {loginErrorMessage}
          </div>
        )}

        <div>
          <label htmlFor="email" className="auth-label">
            {t('form.email')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="auth-input"
            placeholder={t('login.emailPlaceholder')}
            {...register('email')}
          />
          {errors.email && (
            <p className="auth-error">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="auth-label mb-0">
              {t('form.password')}
            </label>
            <Link
              to="/reset-password"
              className="text-xs text-brand-green/60 transition-colors hover:text-brand-orange"
            >
              {t('login.resetPassword')}
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
              aria-label={showPassword ? t('password.hide') : t('password.show')}
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
              {t('login.signingIn')}
            </>
          ) : (
            t('login.signIn')
          )}
        </button>

        <SsoButtons />
      </form>
    </AuthLayout>
  )
}
