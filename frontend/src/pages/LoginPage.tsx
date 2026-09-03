import { useMutation } from '@tanstack/react-query'
import { ClientRegisteredCorrespondenceFields } from '@/components/crm/ClientRegisteredCorrespondenceFields'
import {
  correspondenceAddressPayload,
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
  registerStepOneSchema,
  type LoginFormData,
  type MfaVerifyFormData,
  type RegisterFormData,
} from '../features/auth/schemas'
import { SUPPORTED_INVOICE_CURRENCIES } from '../features/crm/billingProfile'
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
  const [step, setStep] = useState<1 | 2>(1)
  const [registeredLegalAddress, setRegisteredLegalAddress] = useState(
    emptyClientAddressInput(),
  )
  const [correspondenceAddress, setCorrespondenceAddress] = useState(
    emptyClientAddressInput(),
  )
  const [correspondenceSameAsRegistered, setCorrespondenceSameAsRegistered] = useState(true)

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    getValues,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
      gdprConsent: false,
      includeBilling: false,
      preferredCurrency: 'EUR',
      paymentTermsDays: 30,
      billingEmail: '',
      billingName: '',
      vatNo: '',
      billingAddressLine1: '',
      billingAddressLine2: '',
      billingCity: '',
      billingRegion: '',
      billingPostalCode: '',
      billingCountry: '',
    },
  })

  const includeBilling = watch('includeBilling')

  const registerMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => onSuccess(data.user),
  })

  const goNext = () => {
    clearErrors()
    const values = getValues()
    const stepOne = registerStepOneSchema.safeParse({
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword,
      gdprConsent: Boolean(values.gdprConsent),
      companyName: values.companyName,
    })

    if (!stepOne.success) {
      for (const issue of stepOne.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string') {
          setError(field as keyof RegisterFormData, {
            message: t(issue.message),
          })
        }
      }
      return
    }

    setStep(2)
  }

  const onSubmit = handleSubmit((data) => {
    const parsed = registerSchema.safeParse(data)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof RegisterFormData
        if (field) setError(field, { message: t(issue.message) })
      }
      setStep(1)
      return
    }
    registerMutation.mutate({
      ...parsed.data,
      registeredLegalAddress: toClientAddressPayload(registeredLegalAddress),
      correspondenceAddress: correspondenceAddressPayload(
        registeredLegalAddress,
        correspondenceAddress,
        correspondenceSameAsRegistered,
      ),
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

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-brand-green/70">
          <span>
            {t('signup.steps.progress', { current: step, total: 2 })}
          </span>
          <span>
            {step === 1
              ? t('signup.steps.account')
              : t('signup.steps.optionalExtras')}
          </span>
        </div>
        <div className="flex gap-2">
          <div
            className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-brand-orange' : 'bg-brand-green/15'}`}
          />
          <div
            className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-brand-orange' : 'bg-brand-green/15'}`}
          />
        </div>
      </div>

      {step === 1 ? (
        <>
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
            {errors.fullName && (
              <p className="auth-error">{errors.fullName.message}</p>
            )}
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
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="auth-error">{errors.confirmPassword.message}</p>
            )}
          </div>

          <label className="flex items-start gap-3 text-sm text-white/90 lg:text-brand-green/80">
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
            type="button"
            onClick={() => goNext()}
            className="btn-primary w-full py-3"
          >
            {t('signup.steps.continue')}
          </button>

          <SsoButtons signup />
        </>
      ) : (
        <>
          <p className="text-sm text-white/80 lg:text-brand-green/70">
            {t('signup.steps.optionalIntro')}
          </p>

          <div className="space-y-4 border-t border-brand-green/10 pt-4">
            <p className="text-sm font-medium text-brand-green">
              {t('signup.addressesTitle', { ns: 'auth' })}
              <span className="ml-1 text-brand-green/50">{t('signup.optional')}</span>
            </p>
            <ClientRegisteredCorrespondenceFields
              idPrefix="signup"
              variant="auth"
              registered={registeredLegalAddress}
              correspondence={correspondenceAddress}
              onRegisteredChange={setRegisteredLegalAddress}
              onCorrespondenceChange={setCorrespondenceAddress}
              sameAsRegistered={correspondenceSameAsRegistered}
              onSameAsRegisteredChange={setCorrespondenceSameAsRegistered}
            />
          </div>

          <div className="space-y-3 border-t border-brand-green/10 pt-4">
            <label className="flex items-start gap-2 text-sm text-brand-green">
              <input
                type="checkbox"
                className="mt-0.5"
                {...register('includeBilling')}
              />
              <span>
                {t('signup.billing.toggle')}
                <span className="ml-1 text-brand-green/50">
                  {t('signup.optional')}
                </span>
              </span>
            </label>
            <p className="text-xs text-brand-green/60">{t('signup.billing.hint')}</p>

            {includeBilling ? (
              <div className="space-y-3 rounded-lg border border-brand-green/15 p-3">
                <div>
                  <label htmlFor="billingName" className="auth-label">
                    {t('signup.billing.billingName')}
                  </label>
                  <input
                    id="billingName"
                    className="auth-input"
                    {...register('billingName')}
                  />
                </div>
                <div>
                  <label htmlFor="billingEmail" className="auth-label">
                    {t('signup.billing.billingEmail')}
                  </label>
                  <input
                    id="billingEmail"
                    type="email"
                    className="auth-input"
                    placeholder={t('signup.billing.billingEmailPlaceholder')}
                    {...register('billingEmail')}
                  />
                </div>
                <div>
                  <label htmlFor="vatNo" className="auth-label">
                    {t('signup.billing.vatNo')}
                  </label>
                  <input id="vatNo" className="auth-input" {...register('vatNo')} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="preferredCurrency" className="auth-label">
                      {t('signup.billing.currency')}
                    </label>
                    <select
                      id="preferredCurrency"
                      className="auth-input"
                      {...register('preferredCurrency')}
                    >
                      {SUPPORTED_INVOICE_CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="paymentTermsDays" className="auth-label">
                      {t('signup.billing.paymentTerms')}
                    </label>
                    <input
                      id="paymentTermsDays"
                      type="number"
                      min={1}
                      max={365}
                      className="auth-input"
                      {...register('paymentTermsDays')}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="billingAddressLine1" className="auth-label">
                    {t('signup.billing.addressLine1')}
                  </label>
                  <input
                    id="billingAddressLine1"
                    className="auth-input"
                    {...register('billingAddressLine1')}
                  />
                </div>
                <div>
                  <label htmlFor="billingAddressLine2" className="auth-label">
                    {t('signup.billing.addressLine2')}
                  </label>
                  <input
                    id="billingAddressLine2"
                    className="auth-input"
                    {...register('billingAddressLine2')}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="billingCity" className="auth-label">
                      {t('signup.billing.city')}
                    </label>
                    <input
                      id="billingCity"
                      className="auth-input"
                      {...register('billingCity')}
                    />
                  </div>
                  <div>
                    <label htmlFor="billingPostalCode" className="auth-label">
                      {t('signup.billing.postalCode')}
                    </label>
                    <input
                      id="billingPostalCode"
                      className="auth-input"
                      {...register('billingPostalCode')}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="billingRegion" className="auth-label">
                      {t('signup.billing.region')}
                    </label>
                    <input
                      id="billingRegion"
                      className="auth-input"
                      {...register('billingRegion')}
                    />
                  </div>
                  <div>
                    <label htmlFor="billingCountry" className="auth-label">
                      {t('signup.billing.country')}
                    </label>
                    <input
                      id="billingCountry"
                      className="auth-input"
                      {...register('billingCountry')}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full rounded-lg border border-brand-green/20 bg-white px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-brand-green/5 sm:flex-1 lg:text-brand-green"
            >
              {t('signup.steps.back')}
            </button>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-[1.4]"
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
          </div>
        </>
      )}
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
