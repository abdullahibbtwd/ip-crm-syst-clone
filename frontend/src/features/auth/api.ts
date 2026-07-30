import { api } from '../../lib/api'
import type { AuthUser } from './types'
import type {
  LoginFormData,
  MfaVerifyFormData,
  RegisterFormData,
  ResetPasswordFormData,
  ResetPasswordRequestData,
} from './schemas'

export type SsoProvider = {
  id: 'microsoft' | 'google'
  name: string
  enabled: boolean
}

export type LoginResponse =
  | { mfaRequired: true }
  | { mfaRequired?: false; user: AuthUser; mfaEnrollmentRequired?: boolean }

export async function fetchSsoProviders() {
  const response = await api.get<{ providers: SsoProvider[] }>('/auth/sso/providers')
  return response.data
}

export async function loginRequest(data: LoginFormData) {
  const response = await api.post<LoginResponse>('/auth/login', data)
  return response.data
}

export async function registerRequest(data: RegisterFormData) {
  const payload: Record<string, unknown> = {
    email: data.email,
    fullName: data.fullName,
    password: data.password,
    companyName: data.companyName?.trim() || undefined,
    gdprConsent: data.gdprConsent,
    registeredLegalAddress: data.registeredLegalAddress,
    correspondenceAddress: data.correspondenceAddress,
  }

  if (data.includeBilling) {
    payload.billingName = data.billingName?.trim() || undefined
    payload.billingEmail = data.billingEmail?.trim() || data.email
    payload.vatNo = data.vatNo?.trim() || undefined
    payload.preferredCurrency = data.preferredCurrency || 'EUR'
    payload.paymentTermsDays = data.paymentTermsDays || 30
    payload.billingAddressLine1 = data.billingAddressLine1?.trim() || undefined
    payload.billingAddressLine2 = data.billingAddressLine2?.trim() || undefined
    payload.billingCity = data.billingCity?.trim() || undefined
    payload.billingRegion = data.billingRegion?.trim() || undefined
    payload.billingPostalCode = data.billingPostalCode?.trim() || undefined
    payload.billingCountry = data.billingCountry?.trim() || undefined
  }

  const response = await api.post<{ user: AuthUser }>('/auth/register', payload)
  return response.data
}

export async function verifyMfaRequest(data: MfaVerifyFormData) {
  const response = await api.post<{ user: AuthUser }>('/auth/mfa/verify', data)
  return response.data
}

export async function fetchMe() {
  const response = await api.get<AuthUser>('/auth/me')
  return response.data
}

export async function updatePreferredLocale(preferredLocale: string) {
  const response = await api.patch<AuthUser>('/auth/me/locale', { preferredLocale })
  return response.data
}

export async function logoutRequest() {
  await api.post('/auth/logout')
}

export async function requestPasswordReset(data: ResetPasswordRequestData) {
  const response = await api.post<{ message: string }>('/auth/forgot-password', data)
  return response.data
}

export async function acceptInvite(token: string, data: ResetPasswordFormData) {
  const response = await api.post<{ message: string }>('/auth/accept-invite', {
    token,
    password: data.password,
  })
  return response.data
}

export async function validateInviteToken(token: string) {
  const response = await api.get<{ email: string; fullName: string }>(
    '/auth/invite/validate',
    { params: { token } },
  )
  return response.data
}

export async function resetPassword(token: string, data: ResetPasswordFormData) {
  const response = await api.post<{ message: string }>('/auth/reset-password', {
    token,
    password: data.password,
  })
  return response.data
}

export type MfaSetupResponse = {
  otpauthUrl: string
  secret: string
}

export async function startMfaSetupRequest() {
  const response = await api.post<MfaSetupResponse>('/auth/mfa/setup')
  return response.data
}

export async function enableMfaRequest(data: MfaVerifyFormData) {
  const response = await api.post<{ user: AuthUser; backupCodes: string[] }>(
    '/auth/mfa/enable',
    data,
  )
  return response.data
}

export async function disableMfaRequest(data: { password: string; code: string }) {
  const response = await api.post<{ user: AuthUser }>('/auth/mfa/disable', data)
  return response.data
}

export async function regenerateBackupCodesRequest(data: MfaVerifyFormData) {
  const response = await api.post<string[]>('/auth/mfa/backup-codes', data)
  return response.data
}

export { api }
