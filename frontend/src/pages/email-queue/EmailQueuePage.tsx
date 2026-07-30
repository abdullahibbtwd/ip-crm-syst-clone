import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

function suggestionLabel(
  reason: string | null,
  t: (key: string) => string,
) {
  switch (reason) {
    case 'subject_ref':
      return t('suggestions.subjectRef')
    case 'body_ref':
      return t('suggestions.bodyRef')
    case 'single_active_matter':
      return t('suggestions.singleActiveMatter')
    case 'contact_match':
      return t('suggestions.contactMatch')
    default:
      return t('suggestions.default')
  }
}

function categorySuggestionLabel(
  category: UnlinkedEmail['suggestedCategory'],
  t: (key: string) => string,
) {
  switch (category) {
    case 'office_action':
      return t('suggestions.officeAction')
    case 'renewal':
      return t('suggestions.renewal')
    default:
      return null
  }
}

function displaySender(row: UnlinkedEmail) {
  const meta = row.metadata as { sender?: string } | null
  return row.sender?.trim() || meta?.sender?.trim() || '—'
}

function displaySubject(row: UnlinkedEmail, noSubjectLabel: string) {
  const meta = row.metadata as { subject?: string } | null
  return row.subject?.trim() || meta?.subject?.trim() || noSubjectLabel
}

export function EmailQueuePage() {
  const { t } = useTranslation('emailQueue')
  const { t: tCommon } = useTranslation('common')
  const { data: rows, isLoading, isError } = useEmailQueue()
  const fetchEmails = useFetchMailboxEmails()
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [linkEmailId, setLinkEmailId] = useState<string | null>(null)
  const [replyContext, setReplyContext] = useState<ReplyComposerContext | null>(null)

  const list = rows ?? []
  const linkRow = linkEmailId ? list.find((r) => r.id === linkEmailId) : undefined
  const previewRow = previewId ? list.find((r) => r.id === previewId) : undefined
  const noSubjectLabel = t('noSubject')

  const openLink = (row: UnlinkedEmail) => {
    setPreviewId(null)
    setLinkEmailId(row.id)
  }

  const openReply = (row: UnlinkedEmail) => {
    setPreviewId(null)
    const subject = displaySubject(row, noSubjectLabel)
    setReplyContext({
      unlinkedEmailId: row.id,
      connectionId: row.mailboxConnectionId,
      matterId: row.suggestedMatter?.id,
      matterTitle: row.suggestedMatter?.title,
      to: displaySender(row),
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      inReplyToMessageId: row.internetMessageId,
    })
  }

  const handleDownload = async (id: string) => {
    const data = await emailIntegrationApi.download(id)
    window.open(data.url, '_blank', 'noopener,noreferrer')
  }

  const ingested = fetchEmails.data?.ingested ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('subtitle')}</p>
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
              {t('fetchEmails')}
            </Button>
          </PermissionGate>
          <Link to="/settings/email" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            {t('mailboxSettings')}
          </Link>
        </div>
      </div>

      {fetchEmails.isSuccess ? (
        <p className="text-sm text-emerald-700">
          {t('fetchSuccess', {
            limit: fetchEmails.data?.limit ?? 5,
            ingested,
            emptyHint: ingested === 0 ? t('fetchEmptyHint') : '',
          })}
        </p>
      ) : null}
      {fetchEmails.isError ? (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(fetchEmails.error, t('fetchFailed'))}
        </p>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.received')}</TableHead>
            <TableHead>{t('columns.from')}</TableHead>
            <TableHead>{t('columns.subject')}</TableHead>
            <TableHead>{t('columns.mailbox')}</TableHead>
            <TableHead>{t('columns.suggestion')}</TableHead>
            <TableHead className="w-[140px] text-right">{t('columns.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                {t('loading')}
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-destructive">
                {t('loadFailed')}
              </TableCell>
            </TableRow>
          ) : list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-16 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <Inbox className="size-5 opacity-60" />
                  </div>
                  <p className="font-medium text-foreground">{t('emptyTitle')}</p>
                  <p className="text-sm">{t('emptyDescription')}</p>
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
                    <span className="line-clamp-2 font-medium">
                      {displaySubject(row, noSubjectLabel)}
                    </span>
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
                        {suggestionLabel(row.suggestionReason, t)}
                      </Badge>
                    ) : null}
                    {categorySuggestionLabel(row.suggestedCategory, t) ? (
                      <Badge
                        variant="outline"
                        className={
                          row.suggestedCategory === 'office_action'
                            ? 'normal-case border-amber-500/40 bg-amber-500/10 text-amber-800'
                            : 'normal-case border-sky-500/40 bg-sky-500/10 text-sky-800'
                        }
                      >
                        {categorySuggestionLabel(row.suggestedCategory, t)}
                      </Badge>
                    ) : null}
                    {!row.suggestedMatter && !row.suggestedCategory ? (
                      <span className="text-muted-foreground">{tCommon('yesNo.dash')}</span>
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
                      title={t('actions.viewEmail')}
                      aria-label={t('actions.viewEmail')}
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
                        title={t('actions.reply')}
                        aria-label={t('actions.reply')}
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
                        title={t('actions.attachToMatter')}
                        aria-label={t('actions.attachToMatter')}
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
                      title={t('actions.downloadEml')}
                      aria-label={t('actions.downloadEml')}
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
        emailSubject={linkRow ? displaySubject(linkRow, noSubjectLabel) : undefined}
        suggestedMatter={linkRow?.suggestedMatter}
        suggestedClient={linkRow?.suggestedClient}
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
