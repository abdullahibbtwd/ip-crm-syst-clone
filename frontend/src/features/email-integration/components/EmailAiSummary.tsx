import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { getApiErrorMessage } from '@/lib/api-client'
import { aiApi } from '@/features/ai/api'
import type { QueuedEmailPreview } from '../types'

type EmailAiSummaryProps = {
  emailId: string
  preview: QueuedEmailPreview
}

export function EmailAiSummary({ emailId, preview }: EmailAiSummaryProps) {
  const cached = preview.metadata?.aiSummary?.text ?? null
  const [summary, setSummary] = useState<string | null>(cached)
  const [open, setOpen] = useState(Boolean(cached))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSummary(cached)
    setOpen(Boolean(cached))
    setError(null)
  }, [emailId, cached])

  const summarize = useMutation({
    mutationFn: () =>
      aiApi.summarize({
        targetId: emailId,
        targetType: 'unlinked_email',
        text: preview.bodyText ?? undefined,
      }),
    onSuccess: (data) => {
      setSummary(data.summary)
      setOpen(true)
      setError(null)
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, 'Could not generate summary'))
    },
  })

  const ready = Boolean(summary)

  return (
    <PermissionGate resource="ai" action="create">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={ready ? 'secondary' : 'outline'}
            disabled={ready || summarize.isPending}
            onClick={() => summarize.mutate()}
          >
            {summarize.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {ready ? 'Summary ready' : summarize.isPending ? 'Summarising…' : 'Summarize'}
          </Button>
          {ready ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
              {open ? 'Hide summary' : 'Show summary'}
            </Button>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {ready && open ? (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {summary}
          </div>
        ) : null}
      </div>
    </PermissionGate>
  )
}
