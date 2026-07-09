import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  ClipboardPaste,
  FileText,
  Loader2,
  Mail,
  Sparkles,
  Upload,
} from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
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
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateCorrespondence,
  useParseEml,
  useParsePastedEmail,
} from '@/features/correspondence/hooks/useCorrespondence'
import type {
  CorrespondenceCategory,
  CorrespondenceStatus,
  LogEmailMode,
  ParsedEmailResult,
} from '@/features/correspondence/types'
import {
  CORRESPONDENCE_CATEGORIES,
  CORRESPONDENCE_CATEGORY_LABELS,
} from '@/features/correspondence/utils'
import { useUploadDocument } from '@/features/documents/hooks/useDocuments'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

const MODES: Array<{
  id: Extract<LogEmailMode, 'eml' | 'paste'>
  label: string
  description: string
  icon: typeof Mail
}> = [
  {
    id: 'eml',
    label: 'Upload .eml',
    description: 'Drag a file saved from Outlook or Gmail',
    icon: Mail,
  },
  {
    id: 'paste',
    label: 'Paste email',
    description: 'Copy the full email text from your inbox',
    icon: ClipboardPaste,
  },
]

type LogEmailDrawerProps = {
  open: boolean
  onClose: () => void
  matterId: string
}

function applyParsedFields(
  parsed: ParsedEmailResult,
  setters: {
    setSender: (v: string) => void
    setRecipient: (v: string) => void
    setSubject: (v: string) => void
    setCorrespondenceDate: (v: string) => void
    setBodyText: (v: string | null) => void
    setMessageId: (v: string | null) => void
    setParsedMeta: (v: Record<string, unknown>) => void
  },
  logMethod: 'eml' | 'paste',
) {
  setters.setSender(parsed.sender)
  setters.setRecipient(parsed.recipient)
  setters.setSubject(parsed.subject)
  setters.setCorrespondenceDate(parsed.correspondenceDate)
  setters.setBodyText(parsed.bodyText)
  setters.setMessageId(parsed.messageId)
  setters.setParsedMeta({
    logMethod,
    cc: parsed.cc,
    attachmentCount: parsed.attachments.length,
    headersDetected: parsed.headersDetected,
  })
}

export function LogEmailDrawer({ open, onClose, matterId }: LogEmailDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createCorrespondence = useCreateCorrespondence(matterId)
  const parseEml = useParseEml(matterId)
  const parseText = useParsePastedEmail(matterId)
  const uploadDocument = useUploadDocument(matterId)

  const [mode, setMode] = useState<Extract<LogEmailMode, 'eml' | 'paste'>>('eml')
  const [step, setStep] = useState<'capture' | 'review'>('capture')
  const [category, setCategory] = useState<CorrespondenceCategory>('correspondence')
  const [correspondenceDate, setCorrespondenceDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  )
  const [sender, setSender] = useState('')
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [status, setStatus] = useState<CorrespondenceStatus>('received')
  const [bodyText, setBodyText] = useState<string | null>(null)
  const [messageId, setMessageId] = useState<string | null>(null)
  const [parsedMeta, setParsedMeta] = useState<Record<string, unknown>>({})
  const [emlFile, setEmlFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [emlDragOver, setEmlDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setMode('eml')
    setStep('capture')
    setCategory('correspondence')
    setCorrespondenceDate(new Date().toISOString().slice(0, 10))
    setSender('')
    setRecipient('')
    setSubject('')
    setStatus('received')
    setBodyText(null)
    setMessageId(null)
    setParsedMeta({})
    setEmlFile(null)
    setPastedText('')
    setEmlDragOver(false)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    if (!open) resetForm()
  }, [open])

  const handleModeChange = (next: Extract<LogEmailMode, 'eml' | 'paste'>) => {
    setMode(next)
    setStep('capture')
    setError(null)
  }

  const setters = {
    setSender,
    setRecipient,
    setSubject,
    setCorrespondenceDate,
    setBodyText,
    setMessageId,
    setParsedMeta,
  }

  const processEmlFile = async (file: File | null) => {
    if (!file) return
    setError(null)
    setEmlFile(file)
    try {
      const parsed = await parseEml.mutateAsync(file)
      applyParsedFields(parsed, setters, 'eml')
      setStatus('received')
      setStep('review')
    } catch (err) {
      setEmlFile(null)
      setError(getApiErrorMessage(err, 'Could not read the .eml file'))
    }
  }

  const processPastedText = async () => {
    if (!pastedText.trim()) {
      setError('Paste the email content first')
      return
    }
    setError(null)
    try {
      const parsed = await parseText.mutateAsync(pastedText)
      applyParsedFields(parsed, setters, 'paste')
      setStatus('received')
      setStep('review')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not parse pasted email'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!sender.trim() || !recipient.trim() || !subject.trim()) {
      setError('Sender, recipient, and subject are required')
      return
    }

    try {
      let documentVersionId: string | undefined

      if (mode === 'eml' && emlFile) {
        const uploaded = await uploadDocument.mutateAsync({
          file: emlFile,
          displayName: subject.trim() || emlFile.name.replace(/\.eml$/i, ''),
          category: 'correspondence',
          tags: 'email,eml',
        })
        documentVersionId = uploaded.latestVersion?.id
      }

      await createCorrespondence.mutateAsync({
        direction: 'incoming',
        category,
        correspondenceDate,
        sender: sender.trim(),
        recipient: recipient.trim(),
        subject: subject.trim(),
        status,
        source: 'manual',
        messageId: messageId ?? undefined,
        bodyText: bodyText ?? undefined,
        metadata: {
          ...parsedMeta,
          logMethod: parsedMeta.logMethod ?? mode,
        },
        documentVersionId,
      })

      resetForm()
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to log email'))
    }
  }

  const isParsing = parseEml.isPending || parseText.isPending
  const isSaving = createCorrespondence.isPending || uploadDocument.isPending
  const attachmentCount = Number(parsedMeta.attachmentCount ?? 0)
  const showPreview = step === 'review'

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Log email"
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mode selector */}
        <div className="grid gap-2 rounded-xl border bg-muted/20 p-1.5">
          {MODES.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleModeChange(id)}
              className={cn(
                'flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
                mode === id
                  ? 'bg-background shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md',
                  mode === id ? 'bg-primary/10 text-primary' : 'bg-muted',
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Capture step */}
        {mode === 'eml' && step === 'capture' ? (
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
              emlDragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/10',
              emlFile && !isParsing && 'border-emerald-500/40 bg-emerald-500/5',
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setEmlDragOver(true)
            }}
            onDragLeave={() => setEmlDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setEmlDragOver(false)
              const file = e.dataTransfer.files[0]
              if (file) void processEmlFile(file)
            }}
          >
            {isParsing ? (
              <>
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Reading email file…</p>
              </>
            ) : emlFile ? (
              <>
                <CheckCircle2 className="size-8 text-emerald-600" />
                <p className="text-sm font-medium">{emlFile.name}</p>
                <p className="text-xs text-muted-foreground">Parsed — review details below</p>
              </>
            ) : (
              <>
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="size-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Drop your .eml file here</p>
                  <p className="text-xs text-muted-foreground">
                    Save the message from Outlook or Gmail, then drag it in
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse files
                </Button>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".eml,message/rfc822"
              onChange={(e) => void processEmlFile(e.target.files?.[0] ?? null)}
            />
          </div>
        ) : null}

        {mode === 'paste' && step === 'capture' ? (
          <div className="space-y-3">
            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`Paste the full email here, including headers if available:\n\nFrom: client@example.com\nTo: you@firm.com\nSubject: Office Action\nDate: Mon, 9 Jul 2026\n\nDear Counsel,…`}
              className="min-h-[220px] resize-y font-mono text-xs leading-relaxed"
            />
            <Button
              type="button"
              className="w-full"
              disabled={!pastedText.trim() || parseText.isPending}
              onClick={() => void processPastedText()}
            >
              {parseText.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Parsing…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Extract email details
                </>
              )}
            </Button>
          </div>
        ) : null}

        {/* Parsed preview */}
        {showPreview ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0" />
              Email details extracted
              {attachmentCount > 0 ? (
                <Badge variant="outline" className="ml-auto normal-case">
                  {attachmentCount} attachment{attachmentCount === 1 ? '' : 's'} in file
                </Badge>
              ) : null}
            </div>
            <dl className="grid gap-2 text-sm">
              <div className="grid grid-cols-[4rem_1fr] gap-2">
                <dt className="text-muted-foreground">From</dt>
                <dd className="font-medium">{sender || '—'}</dd>
              </div>
              <div className="grid grid-cols-[4rem_1fr] gap-2">
                <dt className="text-muted-foreground">To</dt>
                <dd>{recipient || '—'}</dd>
              </div>
              <div className="grid grid-cols-[4rem_1fr] gap-2">
                <dt className="text-muted-foreground">Subject</dt>
                <dd className="font-medium">{subject || '—'}</dd>
              </div>
            </dl>
            {mode === 'eml' && emlFile ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Original <span className="font-mono">{emlFile.name}</span> will be saved to this
                matter.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Review form */}
        {step === 'review' && (
          <section className="space-y-4 rounded-xl border bg-muted/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4 text-muted-foreground" />
              Confirm & adjust
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Sender</label>
              <Input
                className="bg-background"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="sender@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Recipient</label>
              <Input
                className="bg-background"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="recipient@firm.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <Input
                className="bg-background"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>

            {bodyText ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Body preview</label>
                <div className="max-h-28 overflow-y-auto rounded-md border bg-background p-3 text-xs leading-relaxed text-muted-foreground">
                  {bodyText.slice(0, 600)}
                  {bodyText.length > 600 ? '…' : ''}
                </div>
              </div>
            ) : null}

            {category === 'office_action' ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                A response deadline will be added to the attorney worklist automatically.
              </p>
            ) : null}
          </section>
        )}

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {(step === 'review') && (
            <Button type="submit" disabled={isSaving || isParsing}>
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save to matter'
              )}
            </Button>
          )}
        </div>
      </form>
    </Drawer>
  )
}
