export type DocumentCategory =
  | 'application'
  | 'office_action'
  | 'evidence'
  | 'certificate'
  | 'correspondence'
  | 'renewal'
  | 'general'

export type DocumentUser = {
  id: string
  fullName: string
  email: string
}

export type DocumentVersion = {
  id: string
  documentId: string
  version: number
  fileName: string
  mimeType: string | null
  sizeBytes: number
  storageKey: string
  uploadedById: string
  createdAt: string
  uploadedBy: DocumentUser
}

export type MatterDocument = {
  id: string
  matterId: string
  displayName: string
  category: DocumentCategory
  tags: string[]
  createdAt: string
  updatedAt: string
  createdBy: DocumentUser | null
  versionCount: number
  latestVersion: DocumentVersion | null
}

export type ClientOwnedDocument = {
  id: string
  clientId: string
  scope: 'client'
  displayName: string
  category: DocumentCategory
  tags: string[]
  createdAt: string
  updatedAt: string
  createdBy: DocumentUser | null
  versionCount: number
  latestVersion: DocumentVersion | null
}

export type ClientMatterDocument = {
  id: string
  matterId: string
  matterTitle: string
  scope: 'matter'
  displayName: string
  category: DocumentCategory
  tags: string[]
  createdAt: string
  updatedAt: string
  createdBy: DocumentUser | null
  versionCount: number
  latestVersion: DocumentVersion | null
}

export type ClientDocumentsResponse = {
  matters: Array<{ id: string; title: string }>
  clientDocuments: ClientOwnedDocument[]
  matterDocuments: ClientMatterDocument[]
}

export type SharedDocument = {
  id: string
  scope: 'shared'
  displayName: string
  category: DocumentCategory
  tags: string[]
  createdAt: string
  updatedAt: string
  createdBy: DocumentUser | null
  versionCount: number
  latestVersion: DocumentVersion | null
}

export type FirmDocument = {
  id: string
  displayName: string
  category: DocumentCategory
  matterId: string
  matterTitle: string
  updatedAt: string
  createdBy: DocumentUser | null
}

export type PortalDocument = MatterDocument & {
  matterTitle: string
}

export type DocumentDownloadResponse = {
  url: string
  fileName: string
  mimeType: string | null
  version: number
}

export type DocumentFilters = {
  category?: DocumentCategory
  search?: string
  matterId?: string
}

export type UploadDocumentInput = {
  file: File
  displayName?: string
  category: DocumentCategory
  tags?: string
}

export type DocumentTemplate = {
  id: string
  slug: string
  name: string
  category: DocumentCategory
  description: string | null
  hasDocx?: boolean
}

export type GenerateDocumentFormat = 'pdf' | 'docx'
