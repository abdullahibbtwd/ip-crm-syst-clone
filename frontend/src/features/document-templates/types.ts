import type { DocumentCategory } from '@/features/documents/types'

export type DocumentTemplateAdmin = {
  id: string
  slug: string
  name: string
  category: DocumentCategory
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type DocumentTemplateDetail = DocumentTemplateAdmin & {
  referenceLine: string | null
  htmlBody: string
}

export type CreateDocumentTemplateInput = {
  slug: string
  name: string
  category: DocumentCategory
  description?: string
  referenceLine?: string
  htmlBody: string
}

export type UpdateDocumentTemplateInput = {
  name?: string
  category?: DocumentCategory
  description?: string | null
  referenceLine?: string | null
  htmlBody?: string
  isActive?: boolean
}

export type PreviewDocumentTemplateInput = {
  id?: string
  htmlBody?: string
  referenceLine?: string | null
}
