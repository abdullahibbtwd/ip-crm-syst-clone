import { useMemo } from 'react'
import { Inbox, Link2, Loader2, Paperclip, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Drawer } from '@/components/crm/Drawer'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { useEmailQueue, useLinkQueuedEmail } from '../hooks/useEmailIntegration'
import type { UnlinkedEmail } from '../types'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type AttachFromEmailQueueDrawerProps = {
  matterId: string
  matterTitle?: string
  open: boolean
  onClose: () => void
}

function displaySender(row: UnlinkedEmail) {
  const meta = row.metadata as { sender?: string } | null
  return row.sender?.trim() || meta?.sender?.trim() || '—'
}

function displaySubject(row: UnlinkedEmail) {
  const meta = row.metadata as { subject?: string } | null
  return row.subject?.trim() || meta?.subject?.trim() || '(No subject)'
}

function formatReceived(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function AttachFromEmailQueueDrawer({
  matterId,
  matterTitle,
  open,
  onClose,
}: AttachFromEmailQueueDrawerProps) {
  const { data: rows, isLoading } = useEmailQueue()
  const linkEmail = useLinkQueuedEmail()

  const sorted = useMemo(() => {
    const list = rows ?? []
    return [...list].sort((a, b) => {
      const aSuggested = a.suggestedMatterId === matterId ? 1 : 0
      const bSuggested = b.suggestedMatterId === matterId ? 1 : 0
      if (aSuggested !== bSuggested) return bSuggested - aSuggested
      return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    })
  }, [rows, matterId])

  const handleAttach = async (emailId: string, category?: UnlinkedEmail['suggestedCategory']) => {
    try {
      await linkEmail.mutateAsync({
        id: emailId,
        matterId,
        category: category ?? undefined,
      })
      onClose()
    } catch (err) {
      window.alert(getApiErrorMessage(err, 'Failed to attach email'))
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Attach from email queue" className="max-w-lg">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select a queued email to file on{' '}
          <span className="font-medium text-foreground">{matterTitle ?? 'this matter'}</span>
          &apos;s correspondence register.
        </p>

        {isLoading ? (
          <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading queue…
          </p>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Inbox className="size-5 opacity-60" />
            </div>
            <p className="text-sm">No emails in the queue.</p>
            <Link to="/email-queue" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Open email queue
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((row) => {
              const isSuggested = row.suggestedMatterId === matterId
              return (
                <li
                  key={row.id}
                  className={cn(
                    'rounded-lg border p-3',
                    isSuggested && 'border-primary/30 bg-primary/5',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="line-clamp-2 font-medium">{displaySubject(row)}</p>
                        {row.hasAttachments ? (
                          <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                        ) : null}
                        {isSuggested ? (
                          <Badge variant="outline" className="normal-case">
                            <Sparkles className="size-3" />
                            Suggested
                          </Badge>
                        ) : null}
                        {row.suggestedCategory ? (
                          <Badge variant="outline" className="normal-case">
                            {row.suggestedCategory === 'office_action'
                              ? 'Office action'
                              : row.suggestedCategory === 'renewal'
                                ? 'Renewal'
                                : row.suggestedCategory}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        From {displaySender(row)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatReceived(row.receivedAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={linkEmail.isPending}
                      onClick={() => void handleAttach(row.id, row.suggestedCategory)}
                    >
                      {linkEmail.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Link2 className="size-4" />
                      )}
                      {row.suggestedCategory || isSuggested ? 'Confirm & link' : 'Attach'}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Drawer>
  )
}
