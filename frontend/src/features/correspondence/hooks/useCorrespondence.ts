import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deadlineKeys } from '@/features/deadlines/queryKeys'
import { correspondenceApi } from '../api'
import { correspondenceKeys } from '../queryKeys'
import type {
  CorrespondenceStatus,
  CreateCorrespondenceInput,
  UpdateCorrespondenceInput,
} from '../types'
import { isEpoDocumentFetching } from '../utils'

export function useMatterCorrespondence(matterId: string) {
  return useQuery({
    queryKey: correspondenceKeys.matter(matterId),
    queryFn: () => correspondenceApi.listForMatter(matterId),
    enabled: Boolean(matterId),
    refetchInterval: (query) => {
      const rows = query.state.data
      if (!rows?.some(isEpoDocumentFetching)) return false
      return 5_000
    },
  })
}

export function useClientCorrespondence(clientId: string) {
  return useQuery({
    queryKey: correspondenceKeys.client(clientId),
    queryFn: () => correspondenceApi.listForClient(clientId),
    enabled: Boolean(clientId),
    refetchInterval: (query) => {
      const data = query.state.data
      const rows = [
        ...(data?.clientCorrespondence ?? []),
        ...(data?.matterCorrespondence ?? []),
      ]
      if (!rows.some(isEpoDocumentFetching)) return false
      return 5_000
    },
  })
}

export function useMatterTimeline(matterId: string) {
  return useQuery({
    queryKey: correspondenceKeys.timeline(matterId),
    queryFn: () => correspondenceApi.listTimeline(matterId),
    enabled: Boolean(matterId),
  })
}

export function usePortalCorrespondence() {
  return useQuery({
    queryKey: correspondenceKeys.portal(),
    queryFn: () => correspondenceApi.portalList(),
  })
}

export function useCreateCorrespondence(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCorrespondenceInput) =>
      correspondenceApi.create(matterId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: correspondenceKeys.matter(matterId) })
      qc.invalidateQueries({ queryKey: correspondenceKeys.timeline(matterId) })
      qc.invalidateQueries({ queryKey: correspondenceKeys.portal() })
      qc.invalidateQueries({ queryKey: deadlineKeys.matter(matterId) })
      qc.invalidateQueries({ queryKey: deadlineKeys.my() })
    },
  })
}

export function useCreateClientCorrespondence(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCorrespondenceInput) =>
      correspondenceApi.createForClient(clientId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: correspondenceKeys.client(clientId) })
      qc.invalidateQueries({ queryKey: correspondenceKeys.portal() })
    },
  })
}

export function useParseEml(matterId: string) {
  return useMutation({
    mutationFn: (file: File) => correspondenceApi.parseEml(matterId, file),
  })
}

export function useParsePastedEmail(matterId: string) {
  return useMutation({
    mutationFn: (text: string) => correspondenceApi.parseText(matterId, text),
  })
}

export function useParseEmlForClient(clientId: string) {
  return useMutation({
    mutationFn: (file: File) => correspondenceApi.parseEmlForClient(clientId, file),
  })
}

export function useParsePastedEmailForClient(clientId: string) {
  return useMutation({
    mutationFn: (text: string) => correspondenceApi.parseTextForClient(clientId, text),
  })
}

export function useUpdateCorrespondence(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCorrespondenceInput }) =>
      correspondenceApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: correspondenceKeys.matter(matterId) })
      qc.invalidateQueries({ queryKey: correspondenceKeys.portal() })
    },
  })
}

export function useUpdateCorrespondenceStatus(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CorrespondenceStatus }) =>
      correspondenceApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: correspondenceKeys.matter(matterId) })
    },
  })
}

export function useAttachCorrespondenceDocument(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      documentVersionId,
    }: {
      id: string
      documentVersionId: string
    }) => correspondenceApi.attachDocument(id, documentVersionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: correspondenceKeys.matter(matterId) })
      qc.invalidateQueries({ queryKey: correspondenceKeys.timeline(matterId) })
    },
  })
}
