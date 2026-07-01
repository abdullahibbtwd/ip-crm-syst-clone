import { api } from '../../lib/api'
import type { AuthUser } from './types'
import type {
  LoginFormData,
  MfaVerifyFormData,
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
  | { mfaRequired?: false; user: AuthUser }

export async function fetchSsoProviders() {
  const response = await api.get<{ providers: SsoProvider[] }>('/auth/sso/providers')
  return response.data
}

export async function loginRequest(data: LoginFormData) {
  const response = await api.post<LoginResponse>('/auth/login', data)
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

export async function logoutRequest() {
  await api.post('/auth/logout')
}

export async function requestPasswordReset(data: ResetPasswordRequestData) {
  const response = await api.post<{ message: string }>('/auth/forgot-password', data)
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
  const response = await api.post<{ user: AuthUser }>('/auth/mfa/enable', data)
  return response.data
}

export { api }
