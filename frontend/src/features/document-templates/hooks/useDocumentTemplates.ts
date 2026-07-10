import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { documentTemplatesApi } from '../api'
import { documentTemplatesKeys } from '../queryKeys'
import type {
  CreateDocumentTemplateInput,
  PreviewDocumentTemplateInput,
  UpdateDocumentTemplateInput,
} from '../types'

export function useDocumentTemplatesAdmin() {
  return useQuery({
    queryKey: documentTemplatesKeys.listAdmin(),
    queryFn: () => documentTemplatesApi.listAdmin(),
  })
}

export function useDocumentTemplate(id: string | undefined) {
  return useQuery({
    queryKey: documentTemplatesKeys.detail(id ?? ''),
    queryFn: () => documentTemplatesApi.getById(id!),
    enabled: Boolean(id),
  })
}

export function useMergeFields() {
  return useQuery({
    queryKey: documentTemplatesKeys.mergeFields(),
    queryFn: () => documentTemplatesApi.mergeFields(),
    staleTime: 5 * 60_000,
  })
}

export function useCreateDocumentTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDocumentTemplateInput) => documentTemplatesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: documentTemplatesKeys.lists() }),
  })
}

export function useUpdateDocumentTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentTemplateInput }) =>
      documentTemplatesApi.update(id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: documentTemplatesKeys.lists() })
      qc.invalidateQueries({ queryKey: documentTemplatesKeys.detail(vars.id) })
    },
  })
}

export function useDeactivateDocumentTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => documentTemplatesApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: documentTemplatesKeys.lists() }),
  })
}

export function usePreviewDocumentTemplate() {
  return useMutation({
    mutationFn: (body: PreviewDocumentTemplateInput) =>
      documentTemplatesApi.previewPdf(body),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      // Revoke after the browser has a chance to load it
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
  })
}
