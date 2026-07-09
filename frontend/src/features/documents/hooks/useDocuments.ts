import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '../api'
import { documentKeys } from '../queryKeys'
import type { DocumentFilters, UploadDocumentInput } from '../types'

export function useMatterDocuments(matterId: string, filters?: DocumentFilters) {
  return useQuery({
    queryKey: documentKeys.matter(matterId, filters),
    queryFn: () => documentsApi.listForMatter(matterId, filters),
    enabled: Boolean(matterId),
    placeholderData: keepPreviousData,
  })
}

export function usePortalDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: documentKeys.portal(filters),
    queryFn: () => documentsApi.listForPortal(filters),
    placeholderData: keepPreviousData,
  })
}

export function useUploadDocument(matterId: string, filters?: DocumentFilters) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UploadDocumentInput) => documentsApi.upload(matterId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKeys.matter(matterId, filters) })
      qc.invalidateQueries({ queryKey: documentKeys.matter(matterId) })
    },
  })
}

export function useDocumentDownload() {
  return useMutation({
    mutationFn: ({ documentId, versionId }: { documentId: string; versionId?: string }) =>
      documentsApi.getDownloadUrl(documentId, versionId),
    onSuccess: (data) => {
      window.open(data.url, '_blank', 'noopener,noreferrer')
    },
  })
}

export function useUploadDocumentVersion(matterId: string, documentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => documentsApi.uploadVersion(documentId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKeys.matter(matterId) })
      qc.invalidateQueries({ queryKey: documentKeys.versions(documentId) })
    },
  })
}

export function useDocumentTemplates() {
  return useQuery({
    queryKey: documentKeys.templates(),
    queryFn: () => documentsApi.listTemplates(),
  })
}

export function useGenerateDocument(matterId: string, filters?: DocumentFilters) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) =>
      documentsApi.generateFromTemplate(matterId, templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKeys.matter(matterId, filters) })
      qc.invalidateQueries({ queryKey: documentKeys.matter(matterId) })
    },
  })
}
