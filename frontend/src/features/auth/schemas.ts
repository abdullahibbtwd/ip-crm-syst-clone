import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const resetPasswordRequestSchema = z.object({
  email: z.email('Enter a valid email address'),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const mfaVerifySchema = z.object({
  code: z.string().length(6, 'Enter the 6-digit code'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type ResetPasswordRequestData = z.infer<typeof resetPasswordRequestSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type MfaVerifyFormData = z.infer<typeof mfaVerifySchema>
