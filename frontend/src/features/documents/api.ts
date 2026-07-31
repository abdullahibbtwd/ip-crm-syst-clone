import { api } from '@/lib/api'
import type {
  ClientDocumentsResponse,
  DocumentDownloadResponse,
  DocumentFilters,
  DocumentTemplate,
  DocumentVersion,
  FirmDocument,
  MatterDocument,
  PortalDocument,
  SharedDocument,
  UploadDocumentInput,
} from './types'

export const documentsApi = {
  listFirmWide: (filters?: DocumentFilters) =>
    api.get<FirmDocument[]>('/documents', { params: filters }).then((r) => r.data),

  listShared: (filters?: DocumentFilters) =>
    api.get<SharedDocument[]>('/shared-documents', { params: filters }).then((r) => r.data),

  listForMatter: (matterId: string, filters?: DocumentFilters) =>
    api
      .get<MatterDocument[]>(`/matters/${matterId}/documents`, { params: filters })
      .then((r) => r.data),

  listForClient: (clientId: string, filters?: DocumentFilters) =>
    api
      .get<ClientDocumentsResponse>(`/clients/${clientId}/documents`, {
        params: filters,
      })
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

  uploadForClient: (clientId: string, input: UploadDocumentInput) => {
    const form = new FormData()
    form.append('file', input.file)
    if (input.displayName?.trim()) form.append('displayName', input.displayName.trim())
    form.append('category', input.category)
    if (input.tags?.trim()) form.append('tags', input.tags.trim())
    return api
      .post(`/clients/${clientId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  uploadShared: (input: UploadDocumentInput) => {
    const form = new FormData()
    form.append('file', input.file)
    if (input.displayName?.trim()) form.append('displayName', input.displayName.trim())
    form.append('category', input.category)
    if (input.tags?.trim()) form.append('tags', input.tags.trim())
    return api
      .post<SharedDocument>('/shared-documents', form, {
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

  getClientDownloadUrl: (clientId: string, documentId: string, versionId?: string) =>
    api
      .get<DocumentDownloadResponse>(
        `/clients/${clientId}/documents/${documentId}/download`,
        { params: versionId ? { versionId } : undefined },
      )
      .then((r) => r.data),

  getSharedDownloadUrl: (documentId: string, versionId?: string) =>
    api
      .get<DocumentDownloadResponse>(`/shared-documents/${documentId}/download`, {
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

  uploadClientVersion: (clientId: string, documentId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<DocumentVersion>(
        `/clients/${clientId}/documents/${documentId}/versions`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
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
