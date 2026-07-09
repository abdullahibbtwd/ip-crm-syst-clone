export type CorrespondenceDirection = 'incoming' | 'outgoing'

export type CorrespondenceStatus = 'draft' | 'sent' | 'received' | 'replied'

export type CorrespondenceSource = 'manual' | 'synced'

export type CorrespondenceCategory =
  | 'application'
  | 'office_action'
  | 'evidence'
  | 'certificate'
  | 'correspondence'

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
  matterId: string
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
  createdAt: string
  updatedAt: string
  createdBy: CorrespondenceUser | null
  documentVersion: CorrespondenceDocumentLink | null
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
