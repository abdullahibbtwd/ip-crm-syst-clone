export type DocumentCategory =
  | 'application'
  | 'office_action'
  | 'evidence'
  | 'certificate'
  | 'correspondence'

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
