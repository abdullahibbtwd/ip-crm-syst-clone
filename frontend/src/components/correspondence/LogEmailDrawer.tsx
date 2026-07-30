import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Textarea } from '@/components/ui/textarea'
import { InsertPrecedentPicker } from '@/features/precedents/components/InsertPrecedentPicker'
import {
  useCreateClientCorrespondence,
  useCreateCorrespondence,
  useParseEml,
  useParseEmlForClient,
  useParsePastedEmail,
  useParsePastedEmailForClient,
} from '@/features/correspondence/hooks/useCorrespondence'
import type {
  CorrespondenceCategory,
  CorrespondenceStatus,
  LogEmailMode,
  ParsedEmailResult,
} from '@/features/correspondence/types'
import {
  CORRESPONDENCE_CATEGORIES,
  correspondenceCategoryLabel,
} from '@/features/correspondence/utils'
import {
  useUploadClientDocument,
  useUploadDocument,
} from '@/features/documents/hooks/useDocuments'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type MatterOption = { id: string; title: string }

type LogEmailDrawerProps = {
  open: boolean
  onClose: () => void
  /** Matter page: fixed matter scope. */
  matterId?: string
  /** Client page: enable client / matter scope picker. */
  clientId?: string
  matters?: MatterOption[]
  /** Prefer opening on client files or a matter folder. */
  initialScope?: 'client' | string
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

export function LogEmailDrawer({
  open,
  onClose,
  matterId,
  clientId,
  matters = [],
  initialScope = 'client',
}: LogEmailDrawerProps) {
  const { t } = useTranslation(['matters', 'common'])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const allowScopePicker = Boolean(clientId) && !matterId

  const modes = useMemo(
    () =>
      [
        {
          id: 'eml' as const,
          label: t('correspondence.logEmail.modeEml'),
          description: t('correspondence.logEmail.modeEmlDesc'),
          icon: Mail,
        },
        {
          id: 'paste' as const,
          label: t('correspondence.logEmail.modePaste'),
          description: t('correspondence.logEmail.modePasteDesc'),
          icon: ClipboardPaste,
        },
      ] satisfies Array<{
        id: Extract<LogEmailMode, 'eml' | 'paste'>
        label: string
        description: string
        icon: typeof Mail
      }>,
    [t],
  )

  const [linkScope, setLinkScope] = useState<'client' | string>(
    matterId ? matterId : initialScope,
  )

  useEffect(() => {
    if (!open) return
    setLinkScope(matterId ? matterId : initialScope)
  }, [open, matterId, initialScope])

  const resolvedMatterId = matterId ?? (linkScope !== 'client' ? linkScope : undefined)
  const isClientScope = Boolean(clientId) && !resolvedMatterId
  const scopeWord = t(
    isClientScope
      ? 'correspondence.logEmail.scopeWordClient'
      : 'correspondence.logEmail.scopeWordMatter',
  )

  const createForMatter = useCreateCorrespondence(resolvedMatterId ?? '')
  const createForClient = useCreateClientCorrespondence(clientId ?? '')
  const parseEmlMatter = useParseEml(resolvedMatterId ?? '')
  const parseEmlClient = useParseEmlForClient(clientId ?? '')
  const parseTextMatter = useParsePastedEmail(resolvedMatterId ?? '')
  const parseTextClient = useParsePastedEmailForClient(clientId ?? '')
  const uploadMatterDoc = useUploadDocument(resolvedMatterId ?? '')
  const uploadClientDoc = useUploadClientDocument(clientId ?? '')

  const parseEml = isClientScope || (!resolvedMatterId && clientId) ? parseEmlClient : parseEmlMatter
  const parseText =
    isClientScope || (!resolvedMatterId && clientId) ? parseTextClient : parseTextMatter
  const uploadDocument = isClientScope ? uploadClientDoc : uploadMatterDoc
  const createCorrespondence = isClientScope ? createForClient : createForMatter

  const [mode, setMode] = useState<Extract<LogEmailMode, 'eml' | 'paste'>>('eml')
  const [step, setStep] = useState<'capture' | 'review'>('capture')
  const [category, setCategory] = useState<CorrespondenceCategory>('correspondence')
  const [isClientVisible, setIsClientVisible] = useState(false)
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
    setIsClientVisible(false)
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
      setError(getApiErrorMessage(err, t('correspondence.logEmail.errors.emlFailed')))
    }
  }

  const processPastedText = async () => {
    if (!pastedText.trim()) {
      setError(t('correspondence.logEmail.errors.pasteEmpty'))
      return
    }
    setError(null)
    try {
      const parsed = await parseText.mutateAsync(pastedText)
      applyParsedFields(parsed, setters, 'paste')
      setStatus('received')
      setStep('review')
    } catch (err) {
      setError(getApiErrorMessage(err, t('correspondence.logEmail.errors.pasteFailed')))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!sender.trim() || !recipient.trim() || !subject.trim()) {
      setError(t('correspondence.logEmail.errors.requiredFields'))
      return
    }
    if (allowScopePicker && linkScope !== 'client' && !linkScope) {
      setError(t('correspondence.logEmail.errors.selectMatterOrClient'))
      return
    }
    if (!isClientScope && !resolvedMatterId) {
      setError(t('correspondence.logEmail.errors.selectScope'))
      return
    }

    try {
      let documentVersionId: string | undefined
      let clientDocumentVersionId: string | undefined

      if (mode === 'eml' && emlFile) {
        const uploaded = await uploadDocument.mutateAsync({
          file: emlFile,
          displayName: subject.trim() || emlFile.name.replace(/\.eml$/i, ''),
          category: 'correspondence',
          tags: 'email,eml',
        })
        const versionId = uploaded.latestVersion?.id
        if (isClientScope) clientDocumentVersionId = versionId
        else documentVersionId = versionId
      }

      const payload = {
        direction: 'incoming' as const,
        category,
        correspondenceDate,
        sender: sender.trim(),
        recipient: recipient.trim(),
        subject: subject.trim(),
        status,
        source: 'manual' as const,
        messageId: messageId ?? undefined,
        bodyText: bodyText ?? undefined,
        metadata: {
          ...parsedMeta,
          logMethod: parsedMeta.logMethod ?? mode,
        },
        isClientVisible,
        ...(isClientScope
          ? { clientDocumentVersionId }
          : { documentVersionId }),
      }

      if (isClientScope) {
        await createForClient.mutateAsync(payload)
      } else {
        await createForMatter.mutateAsync(payload)
      }

      resetForm()
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('correspondence.logEmail.errors.saveFailed')))
    }
  }

  const isParsing = parseEml.isPending || parseText.isPending
  const isSaving = createCorrespondence.isPending || uploadDocument.isPending
  const attachmentCount = Number(parsedMeta.attachmentCount ?? 0)
  const showPreview = step === 'review'
  const saveLabel = isClientScope
    ? t('correspondence.logEmail.saveToClient')
    : t('correspondence.logEmail.saveToMatter')

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('correspondence.logEmail.title')}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {allowScopePicker ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t('correspondence.logEmail.saveTo')}
            </label>
            <Select
              value={linkScope}
              onValueChange={(v) => v && setLinkScope(v)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={t('correspondence.logEmail.chooseScope')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">
                  {t('correspondence.logEmail.scopeClient')}
                </SelectItem>
                {matters.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {t('correspondence.logEmail.scopeMatter', { title: m.title })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="grid gap-2 rounded-xl border bg-muted/20 p-1.5">
          {modes.map(({ id, label, description, icon: Icon }) => (
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
                <p className="text-sm font-medium">{t('correspondence.logEmail.readingFile')}</p>
              </>
            ) : emlFile ? (
              <>
                <CheckCircle2 className="size-8 text-emerald-600" />
                <p className="text-sm font-medium">{emlFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t('correspondence.logEmail.parsedReview')}
                </p>
              </>
            ) : (
              <>
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="size-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('correspondence.logEmail.dropEml')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('correspondence.logEmail.dropEmlHint')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('correspondence.logEmail.browseFiles')}
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
              placeholder={t('correspondence.logEmail.pastePlaceholder')}
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
                  {t('correspondence.logEmail.parsing')}
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {t('correspondence.logEmail.extractDetails')}
                </>
              )}
            </Button>
          </div>
        ) : null}

        {showPreview ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0" />
              {t('correspondence.logEmail.extractedTitle')}
              {attachmentCount > 0 ? (
                <Badge variant="outline" className="ml-auto normal-case">
                  {t('correspondence.logEmail.attachmentCount', { count: attachmentCount })}
                </Badge>
              ) : null}
            </div>
            <dl className="grid gap-2 text-sm">
              <div className="grid grid-cols-[4rem_1fr] gap-2">
                <dt className="text-muted-foreground">{t('correspondence.logEmail.from')}</dt>
                <dd className="font-medium">{sender || '—'}</dd>
              </div>
              <div className="grid grid-cols-[4rem_1fr] gap-2">
                <dt className="text-muted-foreground">{t('correspondence.logEmail.to')}</dt>
                <dd>{recipient || '—'}</dd>
              </div>
              <div className="grid grid-cols-[4rem_1fr] gap-2">
                <dt className="text-muted-foreground">{t('correspondence.logEmail.subject')}</dt>
                <dd className="font-medium">{subject || '—'}</dd>
              </div>
            </dl>
            {mode === 'eml' && emlFile ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {t('correspondence.logEmail.originalSaved', {
                  fileName: emlFile.name,
                  scope: scopeWord,
                })}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 'review' && (
          <section className="space-y-4 rounded-xl border bg-muted/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4 text-muted-foreground" />
              {t('correspondence.logEmail.confirmAdjust')}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('correspondence.logEmail.category')}
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
                  {t('correspondence.logEmail.date')}
                </label>
                <Input
                  type="date"
                  className="bg-background"
                  value={correspondenceDate}
                  onChange={(e) => setCorrespondenceDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('correspondence.logEmail.sender')}
              </label>
              <Input
                className="bg-background"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder={t('correspondence.logEmail.senderPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('correspondence.logEmail.recipient')}
              </label>
              <Input
                className="bg-background"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={t('correspondence.logEmail.recipientPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('correspondence.logEmail.subject')}
              </label>
              <Input
                className="bg-background"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('correspondence.logEmail.subjectPlaceholder')}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('correspondence.logEmail.body')}
                </label>
                <PermissionGate resource="precedent" action="read">
                  <InsertPrecedentPicker
                    onInsert={(html) => {
                      const plain = html
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<\/p>/gi, '\n\n')
                        .replace(/<[^>]+>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .trim()
                      setBodyText((prev) =>
                        prev?.trim() ? `${prev.trim()}\n\n${plain}` : plain,
                      )
                    }}
                  />
                </PermissionGate>
              </div>
              <Textarea
                className="max-h-40 bg-background text-xs leading-relaxed"
                rows={6}
                value={bodyText ?? ''}
                onChange={(e) => setBodyText(e.target.value || null)}
                placeholder={t('correspondence.logEmail.bodyPlaceholder')}
              />
            </div>

            {category === 'office_action' && !isClientScope ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {t('correspondence.logEmail.officeActionHint')}
              </p>
            ) : null}

            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border bg-background px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-input"
                checked={isClientVisible}
                onChange={(e) => setIsClientVisible(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium">
                  {t('correspondence.logEmail.sendToInbox')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('correspondence.logEmail.sendToInboxHint')}
                </span>
              </span>
            </label>
          </section>
        )}

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          {step === 'review' && (
            <Button type="submit" disabled={isSaving || isParsing}>
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('correspondence.logEmail.saving')}
                </>
              ) : (
                saveLabel
              )}
            </Button>
          )}
        </div>
      </form>
    </Drawer>
  )
}
