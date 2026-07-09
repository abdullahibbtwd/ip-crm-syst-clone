export type MailboxProviderId = 'microsoft' | 'google'

export type MailboxConnectionStatus = 'active' | 'revoked' | 'error'

export type UnlinkedEmailStatus = 'pending' | 'linked' | 'dismissed'

export type MailboxProviderInfo = {
  id: MailboxProviderId
  name: string
  enabled: boolean
  redirectUri?: string
}

export type MailboxConnection = {
  id: string
  userId: string
  provider: MailboxProviderId
  emailAddress: string
  status: MailboxConnectionStatus
  lastSyncAt: string | null
  lastSyncError: string | null
  createdAt: string
  updatedAt: string
}

export type QueueMatterSuggestion = {
  id: string
  title: string
  assignedToId: string | null
  client: {
    id: string
    internalCode: string | null
    companyName: string | null
    firstName: string | null
    lastName: string | null
  }
}

export type UnlinkedEmail = {
  id: string
  mailboxConnectionId: string
  externalMessageId: string
  internetMessageId: string | null
  sender: string
  recipient: string
  subject: string
  receivedAt: string
  hasAttachments: boolean
  status: UnlinkedEmailStatus
  suggestedMatterId: string | null
  suggestionReason: string | null
  metadata: Record<string, unknown> | null
  linkedCorrespondenceId: string | null
  linkedAt: string | null
  createdAt: string
  mailboxConnection: {
    id: string
    provider: MailboxProviderId
    emailAddress: string
    userId: string
  }
  suggestedMatter: QueueMatterSuggestion | null
}

export type EmailQueueStats = {
  pending: number
}

export type LinkEmailResult = {
  correspondence: {
    id: string
    matterId: string
    subject: string
    source: 'manual' | 'synced'
  }
  unlinkedEmailId: string
}

export type QueuedEmailPreview = {
  id: string
  sender: string
  recipient: string
  subject: string
  receivedAt: string
  hasAttachments: boolean
  bodyText: string | null
  bodyHtml: string | null
  attachments: Array<{ fileName: string; contentType: string; size: number }>
  mailboxConnection: UnlinkedEmail['mailboxConnection']
  suggestedMatter: QueueMatterSuggestion | null
}
