import type { CorrespondenceCategory } from '@/features/correspondence/types'

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
  suggestedCategory: CorrespondenceCategory | null
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
  internetMessageId: string | null
  externalMessageId: string
  mailboxConnectionId: string
  mailboxConnection: UnlinkedEmail['mailboxConnection']
  suggestedMatter: QueueMatterSuggestion | null
  suggestedCategory: CorrespondenceCategory | null
  metadata?: {
    aiSummary?: { text: string; generatedAt: string; model: string }
    [key: string]: unknown
  } | null
}

export type OutboundAttachment = {
  fileName: string
  contentType: string
  contentBase64: string
}

export type SendOutboundEmailInput = {
  connectionId: string
  matterId: string
  to: string[]
  cc?: string[]
  subject: string
  bodyText: string
  bodyHtml?: string
  inReplyToMessageId?: string
  replyToUnlinkedEmailId?: string
  replyToCorrespondenceId?: string
  category?: CorrespondenceCategory
  isClientVisible?: boolean
  attachments?: OutboundAttachment[]
}

export type OutboundSendResult = {
  correspondenceId: string
  matterId: string
  providerMessageId: string | null
  linkedIncoming: boolean
}

export type OutboundDraftReply = {
  to: string[]
  subject: string
  bodyText: string
  bodyHtml: string
  inReplyToMessageId: string | null
  templateSlug: string | null
  quotedOriginal: string | null
  usedAi?: boolean
}
