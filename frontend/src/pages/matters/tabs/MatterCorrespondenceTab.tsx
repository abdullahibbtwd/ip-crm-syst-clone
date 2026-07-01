import { useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FileText, Link2, Paperclip, Plus, Upload, X } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Drawer } from '@/components/crm/Drawer'
import {
  useCreateCorrespondence,
  useMatterCorrespondence,
  useUpdateCorrespondenceStatus,
} from '@/features/correspondence/hooks/useCorrespondence'
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
  formatCorrespondenceDate,
} from '@/features/correspondence/utils'
import { useMatterDocuments, useUploadDocument } from '@/features/documents/hooks/useDocuments'
import type { DocumentCategory } from '@/features/documents/types'
import { DOCUMENT_CATEGORY_LABELS } from '@/features/documents/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { cn } from '@/lib/utils'
import type { MatterTabContext } from '../MatterLayout'

const DIRECTIONS: CorrespondenceDirection[] = ['incoming', 'outgoing']
const STATUSES: CorrespondenceStatus[] = ['draft', 'sent', 'received', 'replied']
const DOC_CATEGORIES = Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[]

type AttachmentMode = 'none' | 'existing' | 'upload'

export function MatterCorrespondenceTab() {
  const { matterId } = useOutletContext<MatterTabContext>()
  const { data: rows, isLoading, isError } = useMatterCorrespondence(matterId)
  const { data: documents } = useMatterDocuments(matterId)
  const uploadDocument = useUploadDocument(matterId)
  const createCorrespondence = useCreateCorrespondence(matterId)
  const updateStatus = useUpdateCorrespondenceStatus(matterId)
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

  const [drawerOpen, setDrawerOpen] = useState(false)
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

  const pickUploadFile = (picked: File | null) => {
    setUploadFile(picked)
  }

  const setAttachmentModeAndReset = (mode: AttachmentMode) => {
    setAttachmentMode(mode)
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

  const handleDirectionChange = (value: CorrespondenceDirection) => {
    setDirection(value)
    setStatus(defaultStatusForDirection(value))
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
        documentVersionId: linkedVersionId,
      })
      resetForm()
      setDrawerOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to log correspondence'))
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Correspondence</h2>
          <p className="text-sm text-muted-foreground">
            Digital mailroom - log every letter and email for this matter.
          </p>
        </div>
        <PermissionGate resource="correspondence" action="create">
          <Button
            size="sm"
            onClick={() => {
              resetForm()
              setDrawerOpen(true)
            }}
          >
            <Plus className="size-4" />
            Log correspondence
          </Button>
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
            <TableHead className="w-[80px]" />
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                No correspondence logged yet.
              </TableCell>
            </TableRow>
          ) : (
            list.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
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
                <TableCell className="font-medium">{item.subject}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="normal-case">
                    {STATUS_LABELS[item.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.documentVersion ? (
                    <Paperclip
                      className="size-4 text-muted-foreground"
                      aria-label={item.documentVersion.document.displayName}
                    />
                  ) : null}
                </TableCell>
                <TableCell>
                  <PermissionGate resource="correspondence" action="update">
                    {item.status !== 'replied' && item.direction === 'incoming' ? (
                      <Button
                        size="sm"
                        variant="outline"
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
                        variant="outline"
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          updateStatus.mutate({ id: item.id, status: 'sent' })
                        }
                      >
                        Mark sent
                      </Button>
                    ) : null}
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Log correspondence">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Attachment - first */}
          <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">Attachment</h3>
                <p className="text-xs text-muted-foreground">
                  Optional - link a file from the matter or upload a new one
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
              <button
                type="button"
                onClick={() => setAttachmentModeAndReset('none')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors',
                  attachmentMode === 'none'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <X className="size-3.5 shrink-0" />
                None
              </button>
              <button
                type="button"
                onClick={() => setAttachmentModeAndReset('existing')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors',
                  attachmentMode === 'existing'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Link2 className="size-3.5 shrink-0" />
                Link
              </button>
              {canUploadDocument ? (
                <button
                  type="button"
                  onClick={() => setAttachmentModeAndReset('upload')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors',
                    attachmentMode === 'upload'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Upload className="size-3.5 shrink-0" />
                  Upload
                </button>
              ) : null}
            </div>

            {attachmentMode === 'existing' ? (
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Matter document
                </label>
                {documentVersionOptions.length === 0 ? (
                  <p className="rounded-md border border-dashed bg-background px-3 py-4 text-center text-sm text-muted-foreground">
                    No documents on this matter yet.
                    {canUploadDocument ? ' Switch to Upload to add one now.' : null}
                  </p>
                ) : (
                  <Select
                    value={linkedDocumentVersionId || undefined}
                    onValueChange={(v) => v && setLinkedDocumentVersionId(v)}
                  >
                    <SelectTrigger className="h-11 w-full bg-background">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                        <SelectValue placeholder="Select a document from this matter…" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
                      {documentVersionOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} className="py-2.5">
                          <div className="flex flex-col gap-0.5 text-left">
                            <span className="font-medium leading-tight">{opt.displayName}</span>
                            <span className="text-xs text-muted-foreground">
                              {opt.category} · v{opt.version} · {opt.fileName}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : null}

            {attachmentMode === 'upload' ? (
              <div className="space-y-3">
                <div
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-background p-6 text-center transition-colors',
                    uploadDragOver ? 'border-primary bg-primary/5' : 'border-border',
                    uploadFile && 'border-solid border-primary/30',
                  )}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setUploadDragOver(true)
                  }}
                  onDragLeave={() => setUploadDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setUploadDragOver(false)
                    pickUploadFile(e.dataTransfer.files[0] ?? null)
                  }}
                >
                  <Upload className="size-6 text-muted-foreground" />
                  {uploadFile ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Saved under the correspondence subject below
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      PDF, Word, or image - drag here or{' '}
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
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt"
                    onChange={(e) => pickUploadFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Category</label>
                    <Select
                      value={uploadCategory}
                      onValueChange={(v) => v && setUploadCategory(v as DocumentCategory)}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {DOCUMENT_CATEGORY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Tags (optional)
                    </label>
                    <Input
                      className="bg-background"
                      value={uploadTags}
                      onChange={(e) => setUploadTags(e.target.value)}
                      placeholder="bpo, urgent"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* Correspondence details */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="size-4 text-muted-foreground" />
              Correspondence details
            </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Direction</label>
              <Select
                value={direction}
                onValueChange={(v) => v && handleDirectionChange(v as CorrespondenceDirection)}
              >
                <SelectTrigger>
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
              <label className="text-sm text-muted-foreground">Category</label>
              <Select
                value={category}
                onValueChange={(v) => v && setCategory(v as CorrespondenceCategory)}
              >
                <SelectTrigger>
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
              {direction === 'incoming' && category === 'office_action' ? (
                <p className="text-xs text-muted-foreground">
                  A response deadline will be added to the attorney worklist automatically.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Date</label>
              <Input
                type="date"
                value={correspondenceDate}
                onChange={(e) => setCorrespondenceDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Sender</label>
            <Input
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="e.g. BPO, Client: Acme Corp"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Recipient</label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. IP Consulting, Client"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="BPO Office Action - Response Required"
            />
          </div>

          <div className="space-y-1.5 sm:max-w-xs">
            <label className="text-sm text-muted-foreground">Status</label>
            <Select
              value={status}
              onValueChange={(v) => v && setStatus(v as CorrespondenceStatus)}
            >
              <SelectTrigger>
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
          </section>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createCorrespondence.isPending || uploadDocument.isPending}
            >
              {createCorrespondence.isPending || uploadDocument.isPending ? 'Saving…' : 'Save log'}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
