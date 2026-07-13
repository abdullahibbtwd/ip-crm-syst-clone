import { api } from '@/lib/api'
import type {
  DocumentDownloadResponse,
  DocumentFilters,
  DocumentTemplate,
  DocumentVersion,
  MatterDocument,
  PortalDocument,
  UploadDocumentInput,
} from './types'

export const documentsApi = {
  listForMatter: (matterId: string, filters?: DocumentFilters) =>
    api
      .get<MatterDocument[]>(`/matters/${matterId}/documents`, { params: filters })
      .then((r) => r.data),

  listForPortal: (filters?: DocumentFilters) =>
    api.get<PortalDocument[]>('/portal/documents', { params: filters }).then((r) => r.data),

  upload: (matterId: string, input: UploadDocumentInput) => {
    const form = new FormData()
    form.append('file', input.file)
    if (input.displayName?.trim()) form.append('displayName', input.displayName.trim())
    form.append('category', input.category)
    if (input.tags?.trim()) form.append('tags', input.tags.trim())
    return api
      .post<MatterDocument>(`/matters/${matterId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  getDownloadUrl: (documentId: string, versionId?: string) =>
    api
      .get<DocumentDownloadResponse>(`/documents/${documentId}/download`, {
        params: versionId ? { versionId } : undefined,
      })
      .then((r) => r.data),

  listVersions: (documentId: string) =>
    api.get<DocumentVersion[]>(`/documents/${documentId}/versions`).then((r) => r.data),

  uploadVersion: (documentId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<DocumentVersion>(`/documents/${documentId}/versions`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  listTemplates: () =>
    api.get<DocumentTemplate[]>('/document-templates').then((r) => r.data),

  generateFromTemplate: (
    matterId: string,
    templateId: string,
    format: 'pdf' | 'docx' = 'pdf',
  ) =>
    api
      .post<MatterDocument>(`/matters/${matterId}/documents/generate`, {
        templateId,
        format,
      })
      .then((r) => r.data),
}
