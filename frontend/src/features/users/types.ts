import type { Paginated } from '@/features/crm/types'

export type UserSegment = 'team' | 'portal'

export type UserAuthMethod = 'password' | 'sso' | 'pending'

export type UserListItem = {
  id: string
  email: string
  fullName: string
  isActive: boolean
  mfaEnabled: boolean
  authMethod: UserAuthMethod
  roles: string[]
  clientId: string | null
  client: {
    id: string
    internalCode: string | null
    displayName: string
  } | null
  lastLoginAt: string | null
  createdAt: string
  inviteEmailSentAt: string | null
  inviteEmailLastError: string | null
  invitePending: boolean
  neverSignedIn: boolean
}

export type InviteUserResult = UserListItem & {
  inviteEmailSent?: boolean
  inviteEmailError?: string
}

export type UserFilters = {
  segment: UserSegment
  search?: string
  isActive?: boolean
  role?: string
  limit?: number
  cursor?: string
}

export type PaginatedUsers = Paginated<UserListItem>
