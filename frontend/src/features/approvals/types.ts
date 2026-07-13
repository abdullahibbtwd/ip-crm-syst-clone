export type ClientApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export type ApprovalUser = {
  id: string
  fullName: string
  email: string
}

export type ApprovalDocumentLink = {
  id: string
  version: number
  fileName: string
  document: { id: string; displayName: string }
} | null

export type ClientApprovalRequest = {
  id: string
  matterId: string
  clientId: string
  title: string
  description: string | null
  status: ClientApprovalStatus
  documentVersionId: string | null
  dueDate: string | null
  decisionNote: string | null
  requestedById: string
  decidedById: string | null
  requestedAt: string | null
  decidedAt: string | null
  createdAt: string
  updatedAt: string
  requestedBy?: ApprovalUser
  decidedBy?: ApprovalUser | null
  documentVersion?: ApprovalDocumentLink
  matter?: {
    id: string
    title: string
  }
}

export type CreateApprovalInput = {
  title: string
  description?: string
  documentVersionId?: string
  dueDate?: string
}

export type UpdateApprovalInput = {
  title?: string
  description?: string | null
  documentVersionId?: string | null
  dueDate?: string | null
}

export type DecideApprovalInput = {
  decision: 'approved' | 'rejected'
  note?: string
}
