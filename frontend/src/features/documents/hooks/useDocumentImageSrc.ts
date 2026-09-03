import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { documentsApi } from '../api'

export function useDocumentImageSrc(
  documentId?: string | null,
  versionId?: string | null,
  enabled = true,
) {
  const { data: blob, isLoading } = useQuery({
    queryKey: ['document-image-blob', documentId, versionId],
    queryFn: () => documentsApi.getFileBlob(documentId!, versionId ?? undefined),
    enabled: Boolean(documentId) && enabled,
    staleTime: 10 * 60 * 1000,
  })

  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setSrc(null)
      return
    }
    const url = URL.createObjectURL(blob)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  return { src, blob, isLoading }
}
