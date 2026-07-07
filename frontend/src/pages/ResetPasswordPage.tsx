import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { requestPasswordReset, resetPassword } from '../features/auth/api'
import {
  resetPasswordRequestSchema,
  resetPasswordSchema,
  type ResetPasswordFormData,
  type ResetPasswordRequestData,
} from '../features/auth/schemas'
import { AuthFooterLink, AuthLayout } from '../layouts/AuthLayout'

function ForgotPasswordForm() {
  const { t } = useTranslation(['auth', 'common'])
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordRequestData>({
    defaultValues: { email: '' },
  })

  const mutation = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: () => setSubmitted(true),
  })

  const onSubmit = handleSubmit((data) => {
    const parsed = resetPasswordRequestSchema.safeParse(data)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError('email', { message: t(issue.message) })
      }
      return
    }
    mutation.mutate(parsed.data)
  })

  if (submitted) {
    return (
      <AuthLayout
        title={t('reset.checkInboxTitle')}
        subtitle={t('reset.checkInboxSubtitle')}
        footer={<AuthFooterLink to="/login">{t('form.backToSignIn')}</AuthFooterLink>}
      >
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-brand-orange" />
          <p className="text-sm text-brand-green/70">{t('reset.checkInboxHint')}</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('reset.title')}
      subtitle={t('reset.subtitle')}
      footer={<AuthFooterLink to="/login">{t('form.backToSignIn')}</AuthFooterLink>}
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="auth-label">
            {t('form.email')}
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand-green/30"
              aria-hidden
            />
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="auth-input pl-10"
              placeholder={t('reset.emailPlaceholder')}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="auth-error">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('reset.sending')}
            </>
          ) : (
            t('reset.sendResetLink')
          )}
        </button>
      </form>
    </AuthLayout>
  )
}

function NewPasswordForm({ token }: { token: string }) {
  const { t } = useTranslation(['auth', 'common'])
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    defaultValues: { password: '', confirmPassword: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: ResetPasswordFormData) => resetPassword(token, data),
    onSuccess: () => setDone(true),
  })

  const onSubmit = handleSubmit((data) => {
    const parsed = resetPasswordSchema.safeParse(data)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof ResetPasswordFormData
        setError(field, { message: t(issue.message) })
      }
      return
    }
    mutation.mutate(parsed.data)
  })

  if (done) {
    return (
      <AuthLayout
        title={t('reset.updatedTitle')}
        subtitle={t('reset.updatedSubtitle')}
        footer={<AuthFooterLink to="/login">{t('reset.continueToSignIn')}</AuthFooterLink>}
      >
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-brand-orange" />
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('reset.newPasswordTitle')}
      subtitle={t('reset.newPasswordSubtitle')}
      footer={<AuthFooterLink to="/login">{t('form.backToSignIn')}</AuthFooterLink>}
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="password" className="auth-label">
            {t('reset.newPasswordLabel')}
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand-green/30"
              aria-hidden
            />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="auth-input pr-11 pl-10"
              placeholder="••••••••"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-brand-green/40 hover:text-brand-orange"
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
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              className="auth-input pr-11 pl-10"
              placeholder="••••••••"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-brand-green/40 hover:text-brand-orange"
              aria-label={showConfirm ? t('password.hide') : t('password.show')}
            >
              {showConfirm ? (
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

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('reset.updating')}
            </>
          ) : (
            t('reset.updatePassword')
          )}
        </button>
      </form>
    </AuthLayout>
  )
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  if (token) {
    return <NewPasswordForm token={token} />
  }

  return <ForgotPasswordForm />
}
