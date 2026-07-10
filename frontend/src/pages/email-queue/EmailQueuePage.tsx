import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Download,
  Eye,
  Inbox,
  Link2,
  Loader2,
  Paperclip,
  RefreshCw,
  Reply,
} from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { emailIntegrationApi } from '@/features/email-integration/api'
import { EmailPreviewDrawer } from '@/features/email-integration/components/EmailPreviewDrawer'
import { LinkEmailToMatterDrawer } from '@/features/email-integration/components/LinkEmailToMatterDrawer'
import {
  ReplyComposerDrawer,
  type ReplyComposerContext,
} from '@/features/email-integration/components/ReplyComposerDrawer'
import {
  useEmailQueue,
  useFetchMailboxEmails,
} from '@/features/email-integration/hooks/useEmailIntegration'
import type { UnlinkedEmail } from '@/features/email-integration/types'
import { getApiErrorMessage } from '@/lib/api-client'

function formatReceived(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function suggestionLabel(reason: string | null) {
  switch (reason) {
    case 'subject_ref':
      return 'Client ref in subject'
    case 'body_ref':
      return 'Client ref in body'
    case 'single_active_matter':
      return 'Single active matter'
    case 'contact_match':
      return 'Contact match'
    default:
      return 'Suggested matter'
  }
}

function categorySuggestionLabel(category: UnlinkedEmail['suggestedCategory']) {
  switch (category) {
    case 'office_action':
      return 'Office action'
    case 'renewal':
      return 'Renewal'
    default:
      return null
  }
}

function displaySender(row: UnlinkedEmail) {
  const meta = row.metadata as { sender?: string } | null
  return row.sender?.trim() || meta?.sender?.trim() || '—'
}

function displaySubject(row: UnlinkedEmail) {
  const meta = row.metadata as { subject?: string } | null
  return row.subject?.trim() || meta?.subject?.trim() || '(No subject)'
}

export function EmailQueuePage() {
  const { data: rows, isLoading, isError } = useEmailQueue()
  const fetchEmails = useFetchMailboxEmails()
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [linkEmailId, setLinkEmailId] = useState<string | null>(null)
  const [replyContext, setReplyContext] = useState<ReplyComposerContext | null>(null)

  const list = rows ?? []
  const linkRow = linkEmailId ? list.find((r) => r.id === linkEmailId) : undefined
  const previewRow = previewId ? list.find((r) => r.id === previewId) : undefined

  const openLink = (row: UnlinkedEmail) => {
    setPreviewId(null)
    setLinkEmailId(row.id)
  }

  const openReply = (row: UnlinkedEmail) => {
    setPreviewId(null)
    setReplyContext({
      unlinkedEmailId: row.id,
      connectionId: row.mailboxConnectionId,
      matterId: row.suggestedMatter?.id,
      matterTitle: row.suggestedMatter?.title,
      to: displaySender(row),
      subject: displaySubject(row).startsWith('Re:')
        ? displaySubject(row)
        : `Re: ${displaySubject(row)}`,
      inReplyToMessageId: row.internetMessageId,
    })
  }

  const handleDownload = async (id: string) => {
    const data = await emailIntegrationApi.download(id)
    window.open(data.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">Email queue</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Unlinked emails pulled from connected mailboxes. Open an email, then attach it to a
            matter&apos;s correspondence register.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGate resource="email" action="create">
            <Button
              variant="default"
              size="sm"
              disabled={fetchEmails.isPending}
              onClick={() => fetchEmails.mutate()}
            >
              {fetchEmails.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Fetch 5 emails
            </Button>
          </PermissionGate>
          <Link to="/settings/email" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Mailbox settings
          </Link>
        </div>
      </div>

      {fetchEmails.isSuccess ? (
        <p className="text-sm text-emerald-700">
          Fetched up to {fetchEmails.data?.limit ?? 5} inbox message(s) —{' '}
          {fetchEmails.data?.ingested ?? 0} new in queue
          {(fetchEmails.data?.ingested ?? 0) === 0 ? ' (already imported or inbox empty)' : ''}.
        </p>
      ) : null}
      {fetchEmails.isError ? (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(fetchEmails.error, 'Failed to fetch emails')}
        </p>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Received</TableHead>
            <TableHead>From</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Mailbox</TableHead>
            <TableHead>Suggestion</TableHead>
            <TableHead className="w-[140px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                Loading queue…
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-destructive">
                Failed to load email queue.
              </TableCell>
            </TableRow>
          ) : list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-16 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <Inbox className="size-5 opacity-60" />
                  </div>
                  <p className="font-medium text-foreground">Queue is empty</p>
                  <p className="text-sm">
                    Connect a mailbox in settings and fetch emails to import new messages.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            list.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => setPreviewId(row.id)}
              >
                <TableCell className="text-muted-foreground">
                  {formatReceived(row.receivedAt)}
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-sm">
                  {displaySender(row)}
                </TableCell>
                <TableCell className="max-w-[280px]">
                  <div className="flex items-center gap-2">
                    <span className="line-clamp-2 font-medium">{displaySubject(row)}</span>
                    {row.hasAttachments ? (
                      <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.mailboxConnection.emailAddress}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    {row.suggestedMatter ? (
                      <Badge variant="outline" className="normal-case">
                        {suggestionLabel(row.suggestionReason)}
                      </Badge>
                    ) : null}
                    {categorySuggestionLabel(row.suggestedCategory) ? (
                      <Badge
                        variant="outline"
                        className={
                          row.suggestedCategory === 'office_action'
                            ? 'normal-case border-amber-500/40 bg-amber-500/10 text-amber-800'
                            : 'normal-case border-sky-500/40 bg-sky-500/10 text-sky-800'
                        }
                      >
                        {categorySuggestionLabel(row.suggestedCategory)}
                      </Badge>
                    ) : null}
                    {!row.suggestedMatter && !row.suggestedCategory ? (
                      <span className="text-muted-foreground">—</span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="inline-flex items-center justify-end gap-0.5">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      title="View email"
                      aria-label="View email"
                      className="text-sky-600 hover:bg-sky-500/10 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                      onClick={() => setPreviewId(row.id)}
                    >
                      <Eye className="size-4" />
                    </Button>
                    <PermissionGate resource="email" action="create">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        title="Reply"
                        aria-label="Reply"
                        className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                        onClick={() => openReply(row)}
                      >
                        <Reply className="size-4" />
                      </Button>
                    </PermissionGate>
                    <PermissionGate resource="email_queue" action="link">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        title="Attach to matter correspondence"
                        aria-label="Attach to matter correspondence"
                        className="text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                        onClick={() => openLink(row)}
                      >
                        <Link2 className="size-4" />
                      </Button>
                    </PermissionGate>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      title="Download .eml"
                      aria-label="Download .eml"
                      className="text-violet-600 hover:bg-violet-500/10 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                      onClick={() => void handleDownload(row.id)}
                    >
                      <Download className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <EmailPreviewDrawer
        emailId={previewId}
        onClose={() => setPreviewId(null)}
        onReply={
          previewRow
            ? () => {
                openReply(previewRow)
              }
            : undefined
        }
        onAttachToMatter={
          previewRow
            ? () => {
                setLinkEmailId(previewRow.id)
                setPreviewId(null)
              }
            : undefined
        }
      />

      <LinkEmailToMatterDrawer
        emailId={linkEmailId}
        emailSubject={linkRow ? displaySubject(linkRow) : undefined}
        suggestedMatter={linkRow?.suggestedMatter}
        suggestedCategory={linkRow?.suggestedCategory}
        suggestionReason={linkRow?.suggestionReason}
        open={Boolean(linkEmailId)}
        onClose={() => setLinkEmailId(null)}
      />

      <ReplyComposerDrawer
        open={Boolean(replyContext)}
        context={replyContext}
        onClose={() => setReplyContext(null)}
      />
    </div>
  )
}
