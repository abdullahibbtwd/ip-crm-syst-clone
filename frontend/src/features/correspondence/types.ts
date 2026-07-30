export type CorrespondenceDirection = 'incoming' | 'outgoing'

export type CorrespondenceStatus = 'draft' | 'sent' | 'received' | 'replied'

export type CorrespondenceSource = 'manual' | 'synced'

export type CorrespondenceCategory =
  | 'application'
  | 'office_action'
  | 'evidence'
  | 'certificate'
  | 'correspondence'
  | 'renewal'
  | 'general'

export type CorrespondenceUser = {
  id: string
  fullName: string
  email: string
}

export type CorrespondenceDocumentLink = {
  id: string
  version: number
  fileName: string
  document: { id: string; displayName: string }
}

export type Correspondence = {
  id: string
  matterId?: string | null
  clientId?: string | null
  direction: CorrespondenceDirection
  category: CorrespondenceCategory
  correspondenceDate: string
  sender: string
  recipient: string
  subject: string
  status: CorrespondenceStatus
  source: CorrespondenceSource
  messageId: string | null
  bodyText: string | null
  metadata: Record<string, unknown> | null
  isClientVisible: boolean
  documentVersionId: string | null
  clientDocumentVersionId?: string | null
  createdAt: string
  updatedAt: string
  createdBy: CorrespondenceUser | null
  documentVersion: CorrespondenceDocumentLink | null
  clientDocumentVersion?: CorrespondenceDocumentLink | null
}

export type ClientOwnedCorrespondence = Correspondence & {
  scope: 'client'
}

export type ClientMatterCorrespondence = Correspondence & {
  scope: 'matter'
  matterTitle: string | null
}

export type ClientCorrespondenceResponse = {
  matters: Array<{ id: string; title: string }>
  clientCorrespondence: ClientOwnedCorrespondence[]
  matterCorrespondence: ClientMatterCorrespondence[]
}

export type ParsedEmailAttachment = {
  fileName: string
  contentType: string
  size: number
}

export type ParsedEmailResult = {
  sender: string
  recipient: string
  cc: string[]
  subject: string
  correspondenceDate: string
  bodyText: string | null
  messageId: string | null
  attachments: ParsedEmailAttachment[]
  headersDetected: boolean
}

export type CreateCorrespondenceInput = {
  direction: CorrespondenceDirection
  category: CorrespondenceCategory
  correspondenceDate: string
  sender: string
  recipient: string
  subject: string
  status?: CorrespondenceStatus
  source?: CorrespondenceSource
  messageId?: string
  bodyText?: string
  metadata?: Record<string, unknown>
  documentVersionId?: string
  clientDocumentVersionId?: string
  isClientVisible?: boolean
}

export type UpdateCorrespondenceInput = {
  status?: CorrespondenceStatus
  subject?: string
  documentVersionId?: string | null
  isClientVisible?: boolean
}

export type PortalCorrespondence = Correspondence & {
  matter: {
    id: string
    title: string
    matterType: string
    status: string
  }
}

export type MatterTimelineEvent = {
  id: string
  matterId: string
  eventType: 'correspondence' | 'filing' | 'deadline' | 'note' | 'task'
  title: string
  description: string | null
  occurredAt: string
  metadata: Record<string, unknown> | null
  sourceCorrespondenceId: string | null
  createdAt: string
  createdBy: CorrespondenceUser | null
  correspondence: {
    id: string
    direction: CorrespondenceDirection
    status: CorrespondenceStatus
    subject: string
  } | null
}

export type LogEmailMode = 'eml' | 'paste' | 'manual'
