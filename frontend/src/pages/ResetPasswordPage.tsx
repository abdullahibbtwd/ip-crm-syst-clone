import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
        setError('email', { message: issue.message })
      }
      return
    }
    mutation.mutate(parsed.data)
  })

  if (submitted) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle="If an account exists for that email, we've sent password reset instructions."
        footer={<AuthFooterLink to="/login">Back to sign in</AuthFooterLink>}
      >
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-brand-orange" />
          <p className="text-sm text-brand-green/70">
            The link will expire in 1 hour. Check your spam folder if you don't
            see it shortly.
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter your work email and we'll send you a secure link to choose a new password."
      footer={<AuthFooterLink to="/login">Back to sign in</AuthFooterLink>}
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="auth-label">
            Email address
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
              placeholder="you@ipconsulting.bg"
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
              Sending…
            </>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>
    </AuthLayout>
  )
}

function NewPasswordForm({ token }: { token: string }) {
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
        setError(field, { message: issue.message })
      }
      return
    }
    mutation.mutate(parsed.data)
  })

  if (done) {
    return (
      <AuthLayout
        title="Password updated"
        subtitle="Your new password is active. You can now sign in."
        footer={<AuthFooterLink to="/login">Continue to sign in</AuthFooterLink>}
      >
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-brand-orange" />
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Use at least 8 characters with a mix of letters and numbers."
      footer={<AuthFooterLink to="/login">Back to sign in</AuthFooterLink>}
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="password" className="auth-label">
            New password
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

        <div>
          <label htmlFor="confirmPassword" className="auth-label">
            Confirm password
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
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
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
              Updating…
            </>
          ) : (
            'Update password'
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
