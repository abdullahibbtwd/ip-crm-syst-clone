export type AuthUser = {
  id: string
  email: string
  fullName: string
  clientId: string | null
  roles: string[]
  permissions: string[]
  mfaEnabled: boolean
  mfaEnrollmentRequired?: boolean
  preferredLocale: string | null
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: string
  user: AuthUser
}
