import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMatterDocuments, useUploadDocument } from '@/features/documents/hooks/useDocuments'
import {
  requiredAttachesForStage,
  type StageAttachSlot,
} from '@/features/matters/stage-connections'
import type { ProsecutionStage } from '@/features/matters/prosecution-stages'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type MatterStageAttachmentsProps = {
  matterId: string
  stage: ProsecutionStage
  canUpdate: boolean
  hasOfficeAction?: boolean
}

function hasTag(docs: Array<{ tags: string[] }> | undefined, tag: string) {
  const needle = tag.toLowerCase()
  return (docs ?? []).some((d) => d.tags.some((t) => t.toLowerCase() === needle))
}

export function MatterStageAttachments({
  matterId,
  stage,
  canUpdate,
  hasOfficeAction,
}: MatterStageAttachmentsProps) {
  const { t } = useTranslation('matters')
  const { data: documents } = useMatterDocuments(matterId)
  const upload = useUploadDocument(matterId)
  const [err, setErr] = useState<string | null>(null)
  const [busySlot, setBusySlot] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const slots = requiredAttachesForStage(stage, { hasOfficeAction })
  if (slots.length === 0) return null

  const handleAttach = async (slot: StageAttachSlot, file: File) => {
    setErr(null)
    setBusySlot(slot.id)
    try {
      await upload.mutateAsync({
        file,
        displayName: file.name,
        category: slot.category,
        tags: slot.tag,
      })
    } catch (e) {
      setErr(getApiErrorMessage(e, t('prosecution.hub.uploadFailed')))
    } finally {
      setBusySlot(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {slots.map((slot) => {
          const done = hasTag(documents, slot.tag)
          return (
            <div key={slot.id}>
              <input
                ref={(el) => {
                  fileRefs.current[slot.id] = el
                }}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void handleAttach(slot, f)
                }}
              />
              <Button
                type="button"
                variant={done ? 'outline' : 'secondary'}
                size="sm"
                className={cn(
                  'h-8 gap-1.5 text-xs',
                  done && 'border-emerald-500/40 text-emerald-800 dark:text-emerald-200',
                )}
                disabled={!canUpdate || upload.isPending}
                onClick={() => fileRefs.current[slot.id]?.click()}
              >
                {busySlot === slot.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : done ? (
                  <Check className="size-3.5" />
                ) : (
                  <Paperclip className="size-3.5" />
                )}
                {t(slot.labelKey)}
                {slot.required && !done ? ' *' : ''}
              </Button>
            </div>
          )
        })}
      </div>
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
    </div>
  )
}
