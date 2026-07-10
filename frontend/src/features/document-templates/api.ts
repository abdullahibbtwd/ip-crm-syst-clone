import { api } from '@/lib/api'
import { apiClient } from '@/lib/api-client'
import type {
  CreateDocumentTemplateInput,
  DocumentTemplateAdmin,
  DocumentTemplateDetail,
  PreviewDocumentTemplateInput,
  UpdateDocumentTemplateInput,
} from './types'

export const documentTemplatesApi = {
  listAdmin: () =>
    apiClient.get<DocumentTemplateAdmin[]>('/document-templates/admin'),

  mergeFields: () =>
    apiClient.get<{ fields: string[] }>('/document-templates/merge-fields'),

  getById: (id: string) =>
    apiClient.get<DocumentTemplateDetail>(`/document-templates/${id}`),

  create: (data: CreateDocumentTemplateInput) =>
    apiClient.post<DocumentTemplateDetail>('/document-templates', data),

  update: (id: string, data: UpdateDocumentTemplateInput) =>
    apiClient.patch<DocumentTemplateDetail>(`/document-templates/${id}`, data),

  deactivate: (id: string) =>
    apiClient.delete<DocumentTemplateDetail>(`/document-templates/${id}`),

  previewPdf: async (body: PreviewDocumentTemplateInput) => {
    const r = await api.post<Blob>('/document-templates/preview', body, {
      responseType: 'blob',
    })
    const contentType = String(r.headers['content-type'] ?? '')
    if (contentType.includes('application/json')) {
      const text = await r.data.text()
      let parsed: unknown = text
      try {
        parsed = JSON.parse(text)
      } catch {
        /* keep raw text */
      }
      throw Object.assign(new Error('Preview failed'), {
        response: { data: parsed },
      })
    }
    return r.data
  },
}
