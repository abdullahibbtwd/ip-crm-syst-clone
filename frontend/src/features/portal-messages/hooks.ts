import { useQuery } from '@tanstack/react-query'
import { portalMessagesApi } from './api'

export const portalMessageKeys = {
  all: ['portal-messages'] as const,
  list: () => [...portalMessageKeys.all, 'list'] as const,
  detail: (kind: string, id: string) =>
    [...portalMessageKeys.all, 'detail', kind, id] as const,
}

export function usePortalMessages() {
  return useQuery({
    queryKey: portalMessageKeys.list(),
    queryFn: () => portalMessagesApi.list(),
  })
}

export function usePortalMessageDetail(
  kind: 'broadcast' | 'correspondence' | null,
  id: string | null,
) {
  return useQuery({
    queryKey: portalMessageKeys.detail(kind ?? '', id ?? ''),
    queryFn: () =>
      kind === 'broadcast'
        ? portalMessagesApi.getBroadcast(id!)
        : portalMessagesApi.getCorrespondence(id!),
    enabled: Boolean(kind && id),
  })
}
