import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('validation.emailInvalid'),
  password: z.string().min(8, 'validation.passwordMin'),
})

export const resetPasswordRequestSchema = z.object({
  email: z.email('validation.emailInvalid'),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'validation.passwordMin'),
    confirmPassword: z.string().min(8, 'validation.confirmPassword'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation.passwordsMismatch',
    path: ['confirmPassword'],
  })

export const mfaVerifySchema = z.object({
  code: z.string().length(6, 'validation.mfaCodeLength'),
})

const clientAddressSchema = z.object({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
})

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'validation.fullNameMin'),
    email: z.email('validation.emailInvalid'),
    password: z.string().min(8, 'validation.passwordMin'),
    confirmPassword: z.string().min(8, 'validation.confirmPassword'),
    companyName: z.string().optional(),
    gdprConsent: z.boolean().refine((value) => value === true, {
      message: 'validation.gdprRequired',
    }),
    registeredLegalAddress: clientAddressSchema.optional(),
    correspondenceAddress: clientAddressSchema.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation.passwordsMismatch',
    path: ['confirmPassword'],
  })

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ResetPasswordRequestData = z.infer<typeof resetPasswordRequestSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type MfaVerifyFormData = z.infer<typeof mfaVerifySchema>
