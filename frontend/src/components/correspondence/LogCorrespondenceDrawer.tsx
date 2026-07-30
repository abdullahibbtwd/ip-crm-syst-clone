import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Link2, Upload, X } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { InsertPrecedentPicker } from '@/features/precedents/components/InsertPrecedentPicker'
import {
  useCreateClientCorrespondence,
  useCreateCorrespondence,
} from '@/features/correspondence/hooks/useCorrespondence'
import type {
  CorrespondenceCategory,
  CorrespondenceDirection,
  CorrespondenceStatus,
} from '@/features/correspondence/types'
import {
  CORRESPONDENCE_CATEGORIES,
  correspondenceCategoryLabel,
  correspondenceDirectionLabel,
  correspondenceStatusLabel,
  defaultStatusForDirection,
} from '@/features/correspondence/utils'
import {
  useClientDocuments,
  useMatterDocuments,
  useUploadClientDocument,
  useUploadDocument,
} from '@/features/documents/hooks/useDocuments'
import type { DocumentCategory } from '@/features/documents/types'
import { DOCUMENT_CATEGORY_LABELS } from '@/features/documents/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { cn } from '@/lib/utils'

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

const DIRECTIONS: CorrespondenceDirection[] = ['incoming', 'outgoing']
const STATUSES: CorrespondenceStatus[] = ['draft', 'sent', 'received', 'replied']

type AttachmentMode = 'none' | 'existing' | 'upload'
type MatterOption = { id: string; title: string }

type LogCorrespondenceDrawerProps = {
  open: boolean
  onClose: () => void
  matterId?: string
  clientId?: string
  matters?: MatterOption[]
  initialScope?: 'client' | string
}

export function LogCorrespondenceDrawer({
  open,
  onClose,
  matterId,
  clientId,
  matters = [],
  initialScope = 'client',
}: LogCorrespondenceDrawerProps) {
  const { t } = useTranslation(['matters', 'common'])
  const allowScopePicker = Boolean(clientId) && !matterId
  const [linkScope, setLinkScope] = useState<'client' | string>(
    matterId ? matterId : initialScope,
  )

  const resolvedMatterId = matterId ?? (linkScope !== 'client' ? linkScope : undefined)
  const isClientScope = Boolean(clientId) && !resolvedMatterId
  const scopeWord = t(
    isClientScope
      ? 'correspondence.log.scopeWordClient'
      : 'correspondence.log.scopeWordMatter',
  )

  const { data: matterDocuments } = useMatterDocuments(resolvedMatterId ?? '')
  const { data: clientDocumentsBundle } = useClientDocuments(clientId ?? '')
  const uploadMatterDocument = useUploadDocument(resolvedMatterId ?? '')
  const uploadClientDocument = useUploadClientDocument(clientId ?? '')
  const createForMatter = useCreateCorrespondence(resolvedMatterId ?? '')
  const createForClient = useCreateClientCorrespondence(clientId ?? '')
  const uploadDocument = isClientScope ? uploadClientDocument : uploadMatterDocument
  const createCorrespondence = isClientScope ? createForClient : createForMatter
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canUploadDocument = usePermission('document', 'create')

  const documentsForLink = useMemo(() => {
    if (isClientScope) {
      return (clientDocumentsBundle?.clientDocuments ?? []).map((doc) => ({
        id: doc.id,
        displayName: doc.displayName,
        category: doc.category,
        latestVersion: doc.latestVersion,
      }))
    }
    return matterDocuments ?? []
  }, [isClientScope, clientDocumentsBundle?.clientDocuments, matterDocuments])

  const documentVersionOptions = useMemo(
    () =>
      documentsForLink.flatMap((doc) =>
        doc.latestVersion
          ? [
              {
                id: doc.latestVersion.id,
                displayName: doc.displayName,
                category: DOCUMENT_CATEGORY_LABELS[doc.category],
                version: doc.latestVersion.version,
                fileName: doc.latestVersion.fileName,
              },
            ]
          : [],
      ),
    [documentsForLink],
  )

  const [direction, setDirection] = useState<CorrespondenceDirection>('incoming')
  const [category, setCategory] = useState<CorrespondenceCategory>('correspondence')
  const [correspondenceDate, setCorrespondenceDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  )
  const [sender, setSender] = useState('')
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [status, setStatus] = useState<CorrespondenceStatus>('received')
  const [attachmentMode, setAttachmentMode] = useState<AttachmentMode>('none')
  const [linkedDocumentVersionId, setLinkedDocumentVersionId] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('correspondence')
  const [uploadTags, setUploadTags] = useState('')
  const [uploadDragOver, setUploadDragOver] = useState(false)
  const [isClientVisible, setIsClientVisible] = useState(false)
  const [bodyText, setBodyText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLinkScope(matterId ? matterId : initialScope)
    setLinkedDocumentVersionId('')
    setAttachmentMode('none')
  }, [open, matterId, initialScope])

  const resetUploadFields = () => {
    setUploadFile(null)
    setUploadCategory('correspondence')
    setUploadTags('')
    setUploadDragOver(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const resetAttachment = () => {
    setAttachmentMode('none')
    setLinkedDocumentVersionId('')
    resetUploadFields()
  }

  const resetForm = () => {
    setDirection('incoming')
    setCategory('correspondence')
    setCorrespondenceDate(new Date().toISOString().slice(0, 10))
    setSender('')
    setRecipient('')
    setSubject('')
    setStatus('received')
    setIsClientVisible(false)
    setBodyText('')
    resetAttachment()
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleDirectionChange = (value: CorrespondenceDirection) => {
    setDirection(value)
    setStatus(defaultStatusForDirection(value))
  }

  const setAttachmentModeAndReset = (mode: AttachmentMode) => {
    setAttachmentMode(mode)
    setLinkedDocumentVersionId('')
    resetUploadFields()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!sender.trim() || !recipient.trim() || !subject.trim()) {
      setError(t('correspondence.log.errors.requiredFields'))
      return
    }
    if (!isClientScope && !resolvedMatterId) {
      setError(t('correspondence.log.errors.selectScope'))
      return
    }
    if (attachmentMode === 'upload' && !uploadFile) {
      setError(t('correspondence.log.errors.chooseFile'))
      return
    }
    if (attachmentMode === 'existing' && !linkedDocumentVersionId) {
      setError(t('correspondence.log.errors.selectDocument'))
      return
    }
    try {
      let linkedVersionId =
        attachmentMode === 'existing' ? linkedDocumentVersionId : undefined

      if (attachmentMode === 'upload' && uploadFile) {
        const docTitle =
          subject.trim() ||
          uploadFile.name.replace(/\.[^.]+$/, '') ||
          t('correspondence.log.attachmentFallbackName')
        const uploaded = await uploadDocument.mutateAsync({
          file: uploadFile,
          displayName: docTitle,
          category: uploadCategory,
          tags: uploadTags.trim() || undefined,
        })
        linkedVersionId = uploaded.latestVersion?.id
        if (!linkedVersionId) {
          setError(t('correspondence.log.errors.linkFailed'))
          return
        }
      }

      const payload = {
        direction,
        category,
        correspondenceDate,
        sender: sender.trim(),
        recipient: recipient.trim(),
        subject: subject.trim(),
        status,
        isClientVisible,
        bodyText: bodyText.trim() || undefined,
        metadata: { logMethod: 'correspondence' },
        ...(isClientScope
          ? { clientDocumentVersionId: linkedVersionId }
          : { documentVersionId: linkedVersionId }),
      }

      if (isClientScope) {
        await createForClient.mutateAsync(payload)
      } else {
        await createForMatter.mutateAsync(payload)
      }
      resetForm()
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('correspondence.log.errors.saveFailed')))
    }
  }

  if (!open) return null

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title={t('correspondence.log.title')}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {allowScopePicker ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t('correspondence.log.saveTo')}
            </label>
            <Select value={linkScope} onValueChange={(v) => v && setLinkScope(v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={t('correspondence.log.chooseScope')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">{t('correspondence.log.scopeClient')}</SelectItem>
                {matters.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {t('correspondence.log.scopeMatter', { title: m.title })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium">{t('correspondence.log.attachment')}</h3>
              <p className="text-xs text-muted-foreground">
                {t('correspondence.log.attachmentHint', { scope: scopeWord })}
              </p>
            </div>
            {attachmentMode !== 'none' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground"
                onClick={resetAttachment}
              >
                <X className="size-3.5" />
                {t('correspondence.log.clear')}
              </Button>
            ) : null}
          </div>

          <div
            className={cn(
              'grid gap-1 rounded-lg border bg-background p-1',
              canUploadDocument ? 'grid-cols-3' : 'grid-cols-2',
            )}
          >
            {(['none', 'existing', 'upload'] as const).map((mode) => {
              if (mode === 'upload' && !canUploadDocument) return null
              const Icon = mode === 'none' ? X : mode === 'existing' ? Link2 : Upload
              const label =
                mode === 'none'
                  ? t('correspondence.log.modeNone')
                  : mode === 'existing'
                    ? t('correspondence.log.modeLink')
                    : t('correspondence.log.modeUpload')
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAttachmentModeAndReset(mode)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors',
                    attachmentMode === mode
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {label}
                </button>
              )
            })}
          </div>

          {attachmentMode === 'existing' ? (
            <div className="space-y-2">
              {documentVersionOptions.length === 0 ? (
                <p className="rounded-md border border-dashed bg-background px-3 py-4 text-center text-sm text-muted-foreground">
                  {t('correspondence.log.noDocuments', { scope: scopeWord })}
                </p>
              ) : (
                <Select
                  value={linkedDocumentVersionId || undefined}
                  onValueChange={(v) => v && setLinkedDocumentVersionId(v)}
                >
                  <SelectTrigger className="h-11 w-full bg-background">
                    <SelectValue
                      placeholder={t('correspondence.log.selectDocument', {
                        scope: scopeWord,
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {documentVersionOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.displayName} · v{opt.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : null}

          {attachmentMode === 'upload' ? (
            <div
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-background p-6 text-center',
                uploadDragOver && 'border-primary bg-primary/5',
              )}
              onDragOver={(e) => {
                e.preventDefault()
                setUploadDragOver(true)
              }}
              onDragLeave={() => setUploadDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setUploadDragOver(false)
                setUploadFile(e.dataTransfer.files[0] ?? null)
              }}
            >
              {uploadFile ? (
                <p className="text-sm font-medium">{uploadFile.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('correspondence.log.dragFile')}{' '}
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t('correspondence.log.browse')}
                  </button>
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt,.eml"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="size-4 text-muted-foreground" />
            {t('correspondence.log.details')}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('correspondence.log.direction')}
              </label>
              <Select
                value={direction}
                onValueChange={(v) => v && handleDirectionChange(v as CorrespondenceDirection)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {correspondenceDirectionLabel(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('correspondence.log.category')}
              </label>
              <Select
                value={category}
                onValueChange={(v) => v && setCategory(v as CorrespondenceCategory)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CORRESPONDENCE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {correspondenceCategoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('correspondence.log.date')}
              </label>
              <Input
                type="date"
                className="bg-background"
                value={correspondenceDate}
                onChange={(e) => setCorrespondenceDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('correspondence.log.status')}
              </label>
              <Select
                value={status}
                onValueChange={(v) => v && setStatus(v as CorrespondenceStatus)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {correspondenceStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t('correspondence.log.sender')}
            </label>
            <Input
              className="bg-background"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder={t('correspondence.log.senderPlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t('correspondence.log.recipient')}
            </label>
            <Input
              className="bg-background"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={t('correspondence.log.recipientPlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t('correspondence.log.subject')}
            </label>
            <Input
              className="bg-background"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('correspondence.log.subjectPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                {t('correspondence.log.body')}
              </label>
              <PermissionGate resource="precedent" action="read">
                <InsertPrecedentPicker
                  onInsert={(html) => {
                    const plain = htmlToPlainText(html)
                    setBodyText((prev) => (prev.trim() ? `${prev.trim()}\n\n${plain}` : plain))
                  }}
                />
              </PermissionGate>
            </div>
            <Textarea
              className="bg-background"
              rows={5}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder={t('correspondence.log.bodyPlaceholder')}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border bg-background px-3 py-2.5">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-input"
              checked={isClientVisible}
              onChange={(e) => setIsClientVisible(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium">
                {t('correspondence.log.sendToInbox')}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('correspondence.log.sendToInboxHint')}
              </span>
            </span>
          </label>

          {direction === 'incoming' && category === 'office_action' && !isClientScope ? (
            <p className="text-xs text-muted-foreground">
              {t('correspondence.log.officeActionHint')}
            </p>
          ) : null}
        </section>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={createCorrespondence.isPending || uploadDocument.isPending}>
            {createCorrespondence.isPending || uploadDocument.isPending
              ? t('correspondence.log.saving')
              : isClientScope
                ? t('correspondence.log.saveToClient')
                : t('correspondence.log.save')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
