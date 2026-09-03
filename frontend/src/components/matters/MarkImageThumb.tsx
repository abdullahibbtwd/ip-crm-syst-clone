import { ImageIcon } from 'lucide-react'
import { useDocumentImageSrc } from '@/features/documents/hooks/useDocumentImageSrc'
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
  const { src, blob, isLoading } = useDocumentImageSrc(documentId, versionId)
  const dim = size === 'sm' ? 'size-10' : 'size-14'
  const isImage = Boolean(src) && (!blob?.type || blob.type.startsWith('image/'))

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

  if (!isImage || !src) {
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
      src={src}
      alt=""
      className={cn(dim, 'shrink-0 rounded-md border object-contain bg-white', className)}
    />
  )
}
