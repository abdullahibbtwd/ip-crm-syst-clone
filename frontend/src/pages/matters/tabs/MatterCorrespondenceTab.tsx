import { useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Download, ExternalLink, FileText, Link2, Loader2, Mail, Plus, Reply, Upload } from 'lucide-react'
import { LogCorrespondenceDrawer } from '@/components/correspondence/LogCorrespondenceDrawer'
import { LogEmailDrawer } from '@/components/correspondence/LogEmailDrawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { AttachFromEmailQueueDrawer } from '@/features/email-integration/components/AttachFromEmailQueueDrawer'
import {
  ReplyComposerDrawer,
  type ReplyComposerContext,
} from '@/features/email-integration/components/ReplyComposerDrawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useAttachCorrespondenceDocument,
  useMatterCorrespondence,
  useUpdateCorrespondence,
  useUpdateCorrespondenceStatus,
} from '@/features/correspondence/hooks/useCorrespondence'
import type { Correspondence } from '@/features/correspondence/types'
import {
  CORRESPONDENCE_CATEGORY_LABELS,
  DIRECTION_LABELS,
  STATUS_LABELS,
  correspondenceEpoRegisterLink,
  formatCorrespondenceDate,
  isEpoDocumentAutoFetched,
  isEpoDocumentFetching,
} from '@/features/correspondence/utils'
import {
  useDocumentDownload,
  useUploadDocument,
} from '@/features/documents/hooks/useDocuments'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type { MatterTabContext } from '../MatterLayout'

function isEmailLog(item: Correspondence): boolean {
  if (item.messageId || item.bodyText) return true
  const fileName = item.documentVersion?.fileName?.toLowerCase() ?? ''
  return fileName.endsWith('.eml')
}

export function MatterCorrespondenceTab() {
  const { matterId, matter } = useOutletContext<MatterTabContext>()
  const { data: rows, isLoading, isError } = useMatterCorrespondence(matterId)
  const updateStatus = useUpdateCorrespondenceStatus(matterId)
  const updateCorrespondence = useUpdateCorrespondence(matterId)
  const attachDocument = useAttachCorrespondenceDocument(matterId)
  const uploadDocument = useUploadDocument(matterId)
  const download = useDocumentDownload()
  const [emailDrawerOpen, setEmailDrawerOpen] = useState(false)
  const [correspondenceDrawerOpen, setCorrespondenceDrawerOpen] = useState(false)
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false)
  const [replyContext, setReplyContext] = useState<ReplyComposerContext | null>(null)
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploading =
    uploadDocument.isPending || attachDocument.isPending

  const openUploadPicker = (correspondenceId: string) => {
    setUploadError(null)
    setUploadTargetId(correspondenceId)
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (file: File | undefined) => {
    if (!file || !uploadTargetId) return
    const correspondenceId = uploadTargetId
    const target = (rows ?? []).find((r) => r.id === correspondenceId)
    try {
      const uploaded = await uploadDocument.mutateAsync({
        file,
        displayName:
          file.name.replace(/\.[^.]+$/, '') ||
          target?.subject?.slice(0, 80) ||
          'Correspondence attachment',
        category: target?.category ?? 'correspondence',
        tags: 'epo-upload',
      })
      const versionId = uploaded.latestVersion?.id
      if (!versionId) {
        throw new Error('Upload succeeded but no document version was returned')
      }
      await attachDocument.mutateAsync({
        id: correspondenceId,
        documentVersionId: versionId,
      })
    } catch (err) {
      setUploadError(getApiErrorMessage(err, 'Failed to upload and attach file'))
    } finally {
      setUploadTargetId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (isLoading && !rows) {
    return <p className="text-sm text-muted-foreground">Loading correspondence…</p>
  }
  if (isError) {
    return <p className="text-sm text-destructive">Failed to load correspondence.</p>
  }

  const list = rows ?? []

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.eml,application/pdf"
        onChange={(e) => void handleFileSelected(e.target.files?.[0])}
      />

      {uploadError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {uploadError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Correspondence</h2>
          <p className="text-sm text-muted-foreground">
            Digital mailroom — log letters, office actions, and emails for this matter. Use{' '}
            <strong className="font-medium text-foreground">Log email</strong> for .eml files or
            pasted inbox text; use <strong className="font-medium text-foreground">Log correspondence</strong>{' '}
            for structured entries, outgoing mail, and document attachments.
          </p>
        </div>
        <PermissionGate resource="correspondence" action="create">
          <div className="flex flex-wrap gap-2">
            <PermissionGate resource="email_queue" action="link">
              <Button size="sm" variant="secondary" onClick={() => setQueueDrawerOpen(true)}>
                <Link2 className="size-4" />
                Attach from queue
              </Button>
            </PermissionGate>
            <Button size="sm" variant="outline" onClick={() => setCorrespondenceDrawerOpen(true)}>
              <FileText className="size-4" />
              Log correspondence
            </Button>
            <Button size="sm" onClick={() => setEmailDrawerOpen(true)}>
              <Mail className="size-4" />
              Log email
            </Button>
          </div>
        </PermissionGate>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Direction</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>From / To</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[72px]">File</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-16 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <Mail className="size-5 opacity-60" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">No correspondence yet</p>
                    <p className="text-sm">
                      Log correspondence or an email to build this matter&apos;s record.
                    </p>
                  </div>
                  <PermissionGate resource="correspondence" action="create">
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCorrespondenceDrawerOpen(true)}
                      >
                        <FileText className="size-4" />
                        Log correspondence
                      </Button>
                      <Button size="sm" onClick={() => setEmailDrawerOpen(true)}>
                        <Plus className="size-4" />
                        Log email
                      </Button>
                    </div>
                  </PermissionGate>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            list.map((item) => {
              const epoLink = correspondenceEpoRegisterLink(item)
              return (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        'normal-case',
                        item.direction === 'incoming'
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400',
                      )}
                    >
                      {DIRECTION_LABELS[item.direction]}
                    </Badge>
                    {isEmailLog(item) ? (
                      <Badge
                        variant="outline"
                        className="normal-case border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400"
                      >
                        Email
                      </Badge>
                    ) : null}
                    {item.source === 'synced' ? (
                      <Badge
                        variant="outline"
                        className="normal-case border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400"
                      >
                        Synced
                      </Badge>
                    ) : null}
                    {item.isClientVisible ? (
                      <Badge
                        variant="outline"
                        className="normal-case border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                      >
                        Client visible
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {CORRESPONDENCE_CATEGORY_LABELS[item.category]}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatCorrespondenceDate(item.correspondenceDate)}
                </TableCell>
                <TableCell className="whitespace-normal text-sm">
                  <div>
                    <span className="text-muted-foreground">From:</span> {item.sender}
                  </div>
                  <div>
                    <span className="text-muted-foreground">To:</span> {item.recipient}
                  </div>
                </TableCell>
                <TableCell className="max-w-[240px] font-medium">
                  {epoLink ? (
                    <a
                      href={epoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-2 text-primary underline-offset-2 hover:underline"
                      title="Open on EPO Register"
                    >
                      {item.subject}
                    </a>
                  ) : (
                    <span className="line-clamp-2">{item.subject}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="normal-case">
                    {STATUS_LABELS[item.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.documentVersion ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground"
                        title={`Download ${item.documentVersion.fileName}`}
                        disabled={download.isPending}
                        onClick={() =>
                          download.mutate({
                            documentId: item.documentVersion!.document.id,
                            versionId: item.documentVersion!.id,
                          })
                        }
                      >
                        <Download className="size-4" />
                        <span className="sr-only">Download attachment</span>
                      </Button>
                      {isEpoDocumentAutoFetched(item) ? (
                        <Badge variant="success" className="normal-case">
                          Document ready
                        </Badge>
                      ) : null}
                    </div>
                  ) : isEpoDocumentFetching(item) ? (
                    <Badge variant="info" className="normal-case gap-1">
                      <Loader2 className="size-3 animate-spin" />
                      Fetching document…
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {epoLink ? (
                      <Button
                        size="sm"
                        variant="outline"
                        title="Open official record on EPO Register"
                        onClick={() =>
                          window.open(epoLink, '_blank', 'noopener,noreferrer')
                        }
                      >
                        <ExternalLink className="size-3.5" />
                        View on EPO
                      </Button>
                    ) : null}
                    <PermissionGate resource="document" action="create">
                      <PermissionGate resource="correspondence" action="update">
                        <Button
                          size="sm"
                          variant="outline"
                          title={
                            item.documentVersion
                              ? 'Replace attached file'
                              : 'Upload PDF or document for this correspondence'
                          }
                          disabled={uploading}
                          onClick={() => openUploadPicker(item.id)}
                        >
                          {uploading && uploadTargetId === item.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Upload className="size-3.5" />
                          )}
                          {item.documentVersion ? 'Replace file' : 'Upload file'}
                        </Button>
                      </PermissionGate>
                    </PermissionGate>
                    {item.direction === 'incoming' ? (
                      <PermissionGate resource="email" action="create">
                        <Button
                          size="sm"
                          variant="outline"
                          title="Reply via connected mailbox"
                          onClick={() =>
                            setReplyContext({
                              matterId,
                              matterTitle: matter.title,
                              correspondenceId: item.id,
                              to: item.sender,
                              subject: item.subject.startsWith('Re:')
                                ? item.subject
                                : `Re: ${item.subject}`,
                              inReplyToMessageId: item.messageId,
                              category: item.category,
                            })
                          }
                        >
                          <Reply className="size-3.5" />
                          Reply
                        </Button>
                      </PermissionGate>
                    ) : null}
                    <PermissionGate resource="correspondence" action="update">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={updateCorrespondence.isPending}
                        title={
                          item.isClientVisible
                            ? 'Hide from client portal'
                            : 'Show in client portal'
                        }
                        onClick={() =>
                          updateCorrespondence.mutate({
                            id: item.id,
                            data: { isClientVisible: !item.isClientVisible },
                          })
                        }
                      >
                        {item.isClientVisible ? 'Hide from client inbox' : 'Send to client inbox'}
                      </Button>
                      {item.status !== 'replied' && item.direction === 'incoming' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({ id: item.id, status: 'replied' })
                          }
                        >
                          Mark replied
                        </Button>
                      ) : item.status === 'draft' && item.direction === 'outgoing' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: item.id, status: 'sent' })}
                        >
                          Mark sent
                        </Button>
                      ) : null}
                    </PermissionGate>
                  </div>
                </TableCell>
              </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      <LogEmailDrawer
        open={emailDrawerOpen}
        onClose={() => setEmailDrawerOpen(false)}
        matterId={matterId}
      />
      <LogCorrespondenceDrawer
        open={correspondenceDrawerOpen}
        onClose={() => setCorrespondenceDrawerOpen(false)}
        matterId={matterId}
      />
      <AttachFromEmailQueueDrawer
        matterId={matterId}
        matterTitle={matter.title}
        open={queueDrawerOpen}
        onClose={() => setQueueDrawerOpen(false)}
      />
      <ReplyComposerDrawer
        open={Boolean(replyContext)}
        context={replyContext}
        onClose={() => setReplyContext(null)}
      />
    </div>
  )
}
