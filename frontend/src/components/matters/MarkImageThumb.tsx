import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { documentsApi } from '@/features/documents/api'
import { cn } from '@/lib/utils'

type MarkImageThumbProps = {
  documentId?: string | null
  versionId?: string | null
  size?: 'sm' | 'md'
  className?: string
}

export function MarkImageThumb({
  documentId,
  versionId,
  size = 'sm',
  className,
}: MarkImageThumbProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['mark-image-thumb', documentId, versionId],
    queryFn: () =>
      documentsApi.getDownloadUrl(documentId!, versionId ?? undefined),
    enabled: Boolean(documentId),
    staleTime: 60 * 1000,
  })

  const [broken, setBroken] = useState(false)

  useEffect(() => {
    setBroken(false)
  }, [documentId, versionId, data?.url])

  const dim = size === 'sm' ? 'size-10' : 'size-14'
  const isImage = Boolean(data?.mimeType?.startsWith('image/')) && !broken

  if (!documentId) return null

  if (isLoading) {
    return (
      <span
        className={cn(
          dim,
          'shrink-0 animate-pulse rounded-md border bg-muted',
          className,
        )}
        aria-hidden
      />
    )
  }

  if (!data?.url || !isImage) {
    return (
      <span
        className={cn(
          dim,
          'flex shrink-0 items-center justify-center rounded-md border bg-muted/40',
          className,
        )}
        aria-hidden
      >
        <ImageIcon className="size-4 text-muted-foreground/60" />
      </span>
    )
  }

  return (
    <img
      src={data.url}
      alt=""
      onError={() => setBroken(true)}
      className={cn(dim, 'shrink-0 rounded-md border object-contain bg-white', className)}
    />
  )
}
