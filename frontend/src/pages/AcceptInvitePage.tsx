import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { SsoButtons } from '@/components/auth/SsoButtons'
import {
  acceptInvite,
  validateInviteToken,
} from '@/features/auth/api'
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from '@/features/auth/schemas'
import { AuthFooterLink, AuthLayout } from '@/layouts/AuthLayout'
import { getApiErrorMessage } from '@/lib/api-client'

function AcceptInviteForm({
  token,
  email,
  fullName,
}: {
  token: string
  email: string
  fullName: string
}) {
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
    mutationFn: (data: ResetPasswordFormData) => acceptInvite(token, data),
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
        title={t('invite.passwordSetTitle')}
        subtitle={t('invite.passwordSetSubtitle')}
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
      title={t('invite.setPasswordTitle')}
      subtitle={t('invite.setPasswordSubtitle', { name: fullName, email })}
      footer={<AuthFooterLink to="/login">{t('form.backToSignIn')}</AuthFooterLink>}
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="password" className="auth-label">
            {t('invite.passwordLabel')}
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

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(mutation.error, t('invite.setPasswordFailed'))}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('invite.settingPassword')}
            </>
          ) : (
            t('invite.setPassword')
          )}
        </button>
      </form>

      <div className="mt-6">
        <SsoButtons />
      </div>
    </AuthLayout>
  )
}

function InvalidInvite() {
  const { t } = useTranslation('auth')
  return (
    <AuthLayout
      title={t('invite.invalidTitle')}
      subtitle={t('invite.invalidSubtitle')}
      footer={<AuthFooterLink to="/login">{t('form.backToSignIn')}</AuthFooterLink>}
    >
      <div className="py-6 text-center text-sm text-brand-green/70">
        {t('invite.invalidHint')}
      </div>
    </AuthLayout>
  )
}

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['invite-validate', token],
    queryFn: () => validateInviteToken(token!),
    enabled: Boolean(token),
    retry: false,
  })

  if (!token) {
    return <InvalidInvite />
  }

  if (isLoading) {
    return (
      <AuthLayout title="" subtitle="">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-green/40" />
        </div>
      </AuthLayout>
    )
  }

  if (isError || !data) {
    return <InvalidInvite />
  }

  return (
    <AcceptInviteForm token={token} email={data.email} fullName={data.fullName} />
  )
}
