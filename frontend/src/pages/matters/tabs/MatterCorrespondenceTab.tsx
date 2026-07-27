import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { BookMarked, Download, ExternalLink, FileText, Link2, Loader2, Mail, Plus, Reply, Upload } from 'lucide-react'
import { LogCorrespondenceDrawer } from '@/components/correspondence/LogCorrespondenceDrawer'
import { LogEmailDrawer } from '@/components/correspondence/LogEmailDrawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { SaveAsPrecedentDrawer } from '@/features/precedents/components/SaveAsPrecedentDrawer'
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
  correspondenceCategoryLabel,
  correspondenceDirectionLabel,
  correspondenceEpoRegisterLink,
  correspondenceStatusLabel,
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
  const { t } = useTranslation(['matters', 'common'])
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
  const [savePrecedentTarget, setSavePrecedentTarget] = useState<Correspondence | null>(null)
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
          t('matters:correspondence.attachmentFallback'),
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
      setUploadError(getApiErrorMessage(err, t('matters:correspondence.uploadFailed')))
    } finally {
      setUploadTargetId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (isLoading && !rows) {
    return <p className="text-sm text-muted-foreground">{t('matters:correspondence.loading')}</p>
  }
  if (isError) {
    return <p className="text-sm text-destructive">{t('matters:correspondence.error')}</p>
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
          <h2 className="font-medium">{t('matters:correspondence.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('matters:correspondence.description', {
              logEmail: t('matters:correspondence.logEmail'),
              logCorrespondence: t('matters:correspondence.add'),
            })}
          </p>
        </div>
        <PermissionGate resource="correspondence" action="create">
          <div className="flex flex-wrap gap-2">
            <PermissionGate resource="email_queue" action="link">
              <Button size="sm" variant="secondary" onClick={() => setQueueDrawerOpen(true)}>
                <Link2 className="size-4" />
                {t('matters:correspondence.attachFromQueue')}
              </Button>
            </PermissionGate>
            <Button size="sm" variant="outline" onClick={() => setCorrespondenceDrawerOpen(true)}>
              <FileText className="size-4" />
              {t('matters:correspondence.add')}
            </Button>
            <Button size="sm" onClick={() => setEmailDrawerOpen(true)}>
              <Mail className="size-4" />
              {t('matters:correspondence.logEmail')}
            </Button>
          </div>
        </PermissionGate>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('matters:correspondence.table.direction')}</TableHead>
            <TableHead>{t('matters:correspondence.table.category')}</TableHead>
            <TableHead>{t('matters:correspondence.table.date')}</TableHead>
            <TableHead>{t('matters:correspondence.table.fromTo')}</TableHead>
            <TableHead>{t('matters:correspondence.table.subject')}</TableHead>
            <TableHead>{t('matters:correspondence.table.status')}</TableHead>
            <TableHead className="w-[72px]">{t('matters:correspondence.table.file')}</TableHead>
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
                    <p className="font-medium text-foreground">{t('matters:correspondence.emptyTitle')}</p>
                    <p className="text-sm">{t('matters:correspondence.emptyHint')}</p>
                  </div>
                  <PermissionGate resource="correspondence" action="create">
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCorrespondenceDrawerOpen(true)}
                      >
                        <FileText className="size-4" />
                        {t('matters:correspondence.add')}
                      </Button>
                      <Button size="sm" onClick={() => setEmailDrawerOpen(true)}>
                        <Plus className="size-4" />
                        {t('matters:correspondence.logEmail')}
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
                      {correspondenceDirectionLabel(item.direction)}
                    </Badge>
                    {isEmailLog(item) ? (
                      <Badge
                        variant="outline"
                        className="normal-case border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400"
                      >
                        {t('matters:correspondence.badges.email')}
                      </Badge>
                    ) : null}
                    {item.source === 'synced' ? (
                      <Badge
                        variant="outline"
                        className="normal-case border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400"
                      >
                        {t('matters:correspondence.badges.synced')}
                      </Badge>
                    ) : null}
                    {item.isClientVisible ? (
                      <Badge
                        variant="outline"
                        className="normal-case border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                      >
                        {t('matters:correspondence.badges.clientVisible')}
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {correspondenceCategoryLabel(item.category)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatCorrespondenceDate(item.correspondenceDate)}
                </TableCell>
                <TableCell className="whitespace-normal text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('matters:correspondence.from')}</span> {item.sender}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('matters:correspondence.to')}</span> {item.recipient}
                  </div>
                </TableCell>
                <TableCell className="max-w-[240px] font-medium">
                  {epoLink ? (
                    <a
                      href={epoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-2 text-primary underline-offset-2 hover:underline"
                      title={t('matters:correspondence.openEpoRegister')}
                    >
                      {item.subject}
                    </a>
                  ) : (
                    <span className="line-clamp-2">{item.subject}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="normal-case">
                    {correspondenceStatusLabel(item.status)}
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
                        title={t('matters:correspondence.downloadTitle', {
                          fileName: item.documentVersion.fileName,
                        })}
                        disabled={download.isPending}
                        onClick={() =>
                          download.mutate({
                            documentId: item.documentVersion!.document.id,
                            versionId: item.documentVersion!.id,
                          })
                        }
                      >
                        <Download className="size-4" />
                        <span className="sr-only">{t('matters:correspondence.downloadAttachment')}</span>
                      </Button>
                      {isEpoDocumentAutoFetched(item) ? (
                        <Badge variant="success" className="normal-case">
                          {t('matters:correspondence.documentReady')}
                        </Badge>
                      ) : null}
                    </div>
                  ) : isEpoDocumentFetching(item) ? (
                    <Badge variant="info" className="normal-case gap-1">
                      <Loader2 className="size-3 animate-spin" />
                      {t('matters:correspondence.fetchingDocument')}
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
                        title={t('matters:correspondence.viewOnEpoTitle')}
                        onClick={() =>
                          window.open(epoLink, '_blank', 'noopener,noreferrer')
                        }
                      >
                        <ExternalLink className="size-3.5" />
                        {t('matters:correspondence.viewOnEpo')}
                      </Button>
                    ) : null}
                    <PermissionGate resource="document" action="create">
                      <PermissionGate resource="correspondence" action="update">
                        <Button
                          size="sm"
                          variant="outline"
                          title={
                            item.documentVersion
                              ? t('matters:correspondence.replaceFileTitle')
                              : t('matters:correspondence.uploadFileTitle')
                          }
                          disabled={uploading}
                          onClick={() => openUploadPicker(item.id)}
                        >
                          {uploading && uploadTargetId === item.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Upload className="size-3.5" />
                          )}
                          {item.documentVersion
                            ? t('matters:correspondence.replaceFile')
                            : t('matters:correspondence.uploadFile')}
                        </Button>
                      </PermissionGate>
                    </PermissionGate>
                    {item.direction === 'incoming' ? (
                      <PermissionGate resource="email" action="create">
                        <Button
                          size="sm"
                          variant="outline"
                          title={t('matters:correspondence.replyTitle')}
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
                          {t('matters:correspondence.reply')}
                        </Button>
                      </PermissionGate>
                    ) : null}
                    {(item.bodyText || item.subject) ? (
                      <PermissionGate resource="precedent" action="create">
                        <Button
                          size="sm"
                          variant="outline"
                          title={t('matters:correspondence.saveAsPrecedentTitle')}
                          onClick={() => setSavePrecedentTarget(item)}
                        >
                          <BookMarked className="size-3.5" />
                          {t('matters:correspondence.saveAsPrecedent')}
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
                            ? t('matters:correspondence.hideFromClientTitle')
                            : t('matters:correspondence.showInClientTitle')
                        }
                        onClick={() =>
                          updateCorrespondence.mutate({
                            id: item.id,
                            data: { isClientVisible: !item.isClientVisible },
                          })
                        }
                      >
                        {item.isClientVisible
                          ? t('matters:correspondence.hideFromClient')
                          : t('matters:correspondence.sendToClient')}
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
                          {t('matters:correspondence.markReplied')}
                        </Button>
                      ) : item.status === 'draft' && item.direction === 'outgoing' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: item.id, status: 'sent' })}
                        >
                          {t('matters:correspondence.markSent')}
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
      {savePrecedentTarget ? (
        <SaveAsPrecedentDrawer
          open
          onClose={() => setSavePrecedentTarget(null)}
          correspondenceId={savePrecedentTarget.id}
          defaultTitle={savePrecedentTarget.subject}
          defaultMatterType={matter.matterType}
        />
      ) : null}
    </div>
  )
}
