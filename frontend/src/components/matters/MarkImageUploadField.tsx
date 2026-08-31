import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type MarkImageUploadFieldProps = {
  file: File | null
  onFileChange: (file: File | null) => void
  /** Existing image URL from document download (matter overview edit). */
  remotePreviewUrl?: string | null
  onClearRemote?: () => void
  disabled?: boolean
  className?: string
}

export function MarkImageUploadField({
  file,
  onFileChange,
  remotePreviewUrl,
  onClearRemote,
  disabled = false,
  className,
}: MarkImageUploadFieldProps) {
  const { t } = useTranslation('matters')
  const inputId = useId()
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setLocalPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setLocalPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const previewUrl = localPreview ?? remotePreviewUrl ?? null
  const showClear = !disabled && (file || (remotePreviewUrl && onClearRemote))

  return (
    <div className={cn('space-y-2', className)}>
      <span className="text-xs text-muted-foreground">{t('trademarkInfo.markImage')}</span>
      <div className="flex flex-wrap items-start gap-3">
        <div
          className={cn(
            'flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30',
            previewUrl ? 'border-border' : 'border-dashed border-muted-foreground/35',
          )}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground/50" aria-hidden />
          )}
        </div>
        <div className="flex min-w-[140px] flex-col gap-2">
          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null
              onFileChange(next)
              e.target.value = ''
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={disabled}
            onClick={() => document.getElementById(inputId)?.click()}
          >
            <Upload className="size-3.5" />
            {previewUrl ? t('trademarkInfo.replaceMarkImage') : t('trademarkInfo.uploadMarkImage')}
          </Button>
          {file ? (
            <p className="max-w-[200px] truncate text-xs text-muted-foreground">{file.name}</p>
          ) : null}
          {showClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 justify-start gap-1 px-2 text-muted-foreground"
              onClick={() => {
                onFileChange(null)
                onClearRemote?.()
              }}
            >
              <X className="size-3.5" />
              {t('trademarkInfo.removeMarkImage')}
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t('trademarkInfo.markImageHint')}</p>
    </div>
  )
}
