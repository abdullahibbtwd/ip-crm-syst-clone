import { useMemo, useRef, useState } from 'react'
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
import { useCreateCorrespondence } from '@/features/correspondence/hooks/useCorrespondence'
import type {
  CorrespondenceCategory,
  CorrespondenceDirection,
  CorrespondenceStatus,
} from '@/features/correspondence/types'
import {
  CORRESPONDENCE_CATEGORIES,
  CORRESPONDENCE_CATEGORY_LABELS,
  DIRECTION_LABELS,
  STATUS_LABELS,
  defaultStatusForDirection,
} from '@/features/correspondence/utils'
import { useMatterDocuments, useUploadDocument } from '@/features/documents/hooks/useDocuments'
import type { DocumentCategory } from '@/features/documents/types'
import { DOCUMENT_CATEGORY_LABELS } from '@/features/documents/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { cn } from '@/lib/utils'

const DIRECTIONS: CorrespondenceDirection[] = ['incoming', 'outgoing']
const STATUSES: CorrespondenceStatus[] = ['draft', 'sent', 'received', 'replied']

type AttachmentMode = 'none' | 'existing' | 'upload'

type LogCorrespondenceDrawerProps = {
  open: boolean
  onClose: () => void
  matterId: string
}

export function LogCorrespondenceDrawer({
  open,
  onClose,
  matterId,
}: LogCorrespondenceDrawerProps) {
  const { data: documents } = useMatterDocuments(matterId)
  const uploadDocument = useUploadDocument(matterId)
  const createCorrespondence = useCreateCorrespondence(matterId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canUploadDocument = usePermission('document', 'create')

  const documentVersionOptions = useMemo(
    () =>
      (documents ?? []).flatMap((doc) =>
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
    [documents],
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
  const [error, setError] = useState<string | null>(null)

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
      setError('Sender, recipient, and subject are required')
      return
    }
    if (attachmentMode === 'upload' && !uploadFile) {
      setError('Choose a file to upload, or change attachment to none / link existing')
      return
    }
    if (attachmentMode === 'existing' && !linkedDocumentVersionId) {
      setError('Select a document from the list, or change attachment mode')
      return
    }
    try {
      let linkedVersionId =
        attachmentMode === 'existing' ? linkedDocumentVersionId : undefined

      if (attachmentMode === 'upload' && uploadFile) {
        const docTitle =
          subject.trim() ||
          uploadFile.name.replace(/\.[^.]+$/, '') ||
          'Correspondence attachment'
        const uploaded = await uploadDocument.mutateAsync({
          file: uploadFile,
          displayName: docTitle,
          category: uploadCategory,
          tags: uploadTags.trim() || undefined,
        })
        linkedVersionId = uploaded.latestVersion?.id
        if (!linkedVersionId) {
          setError('Upload succeeded but could not link the document')
          return
        }
      }

      await createCorrespondence.mutateAsync({
        direction,
        category,
        correspondenceDate,
        sender: sender.trim(),
        recipient: recipient.trim(),
        subject: subject.trim(),
        status,
        metadata: { logMethod: 'correspondence' },
        documentVersionId: linkedVersionId,
      })
      resetForm()
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to log correspondence'))
    }
  }

  if (!open) return null

  return (
    <Drawer open={open} onClose={handleClose} title="Log correspondence" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium">Attachment</h3>
              <p className="text-xs text-muted-foreground">
                Optional — link a file from the matter or upload PDF, Word, images, or .eml
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
                Clear
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
              const label = mode === 'none' ? 'None' : mode === 'existing' ? 'Link' : 'Upload'
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
                  No documents on this matter yet.
                </p>
              ) : (
                <Select
                  value={linkedDocumentVersionId || undefined}
                  onValueChange={(v) => v && setLinkedDocumentVersionId(v)}
                >
                  <SelectTrigger className="h-11 w-full bg-background">
                    <SelectValue placeholder="Select a document from this matter…" />
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
                  Drag a file here or{' '}
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse
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
            Correspondence details
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Direction</label>
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
                      {DIRECTION_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
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
                      {CORRESPONDENCE_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input
                type="date"
                className="bg-background"
                value={correspondenceDate}
                onChange={(e) => setCorrespondenceDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
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
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Sender</label>
            <Input
              className="bg-background"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="e.g. BPO, Client: Acme Corp"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Recipient</label>
            <Input
              className="bg-background"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. IP Consulting, Client"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <Input
              className="bg-background"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="BPO Office Action - Response Required"
            />
          </div>

          {direction === 'incoming' && category === 'office_action' ? (
            <p className="text-xs text-muted-foreground">
              A response deadline will be added to the attorney worklist automatically.
            </p>
          ) : null}
        </section>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createCorrespondence.isPending || uploadDocument.isPending}>
            {createCorrespondence.isPending || uploadDocument.isPending ? 'Saving…' : 'Save log'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
