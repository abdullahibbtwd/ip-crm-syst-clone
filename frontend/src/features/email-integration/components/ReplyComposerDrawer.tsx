import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  FileText,
  Loader2,
  Paperclip,
  Reply,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import type { CorrespondenceCategory } from '@/features/correspondence/types'
import {
  CORRESPONDENCE_CATEGORIES,
  CORRESPONDENCE_CATEGORY_LABELS,
} from '@/features/correspondence/utils'
import { mattersApi } from '@/features/matters/api'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { emailIntegrationApi } from '../api'
import {
  useDraftOutboundReply,
  useMailboxConnections,
  useSendOutboundEmail,
} from '../hooks/useEmailIntegration'
import type { MailboxConnection } from '../types'

export type ReplyComposerContext = {
  matterId?: string
  matterTitle?: string
  unlinkedEmailId?: string
  correspondenceId?: string
  connectionId?: string
  to?: string
  subject?: string
  inReplyToMessageId?: string | null
  category?: CorrespondenceCategory
}

type ReplyComposerDrawerProps = {
  open: boolean
  onClose: () => void
  context: ReplyComposerContext | null
  onSent?: (matterId: string) => void
}

type PendingAttachment = {
  fileName: string
  contentType: string
  contentBase64: string
  size: number
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const base64 = result.includes(',') ? result.split(',')[1]! : result
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function contextKey(ctx: ReplyComposerContext | null) {
  if (!ctx) return ''
  return [
    ctx.matterId ?? '',
    ctx.unlinkedEmailId ?? '',
    ctx.correspondenceId ?? '',
    ctx.connectionId ?? '',
    ctx.to ?? '',
    ctx.subject ?? '',
  ].join('|')
}

export function ReplyComposerDrawer({
  open,
  onClose,
  context,
  onSent,
}: ReplyComposerDrawerProps) {
  const { data: connections } = useMailboxConnections()
  const sendOutbound = useSendOutboundEmail()

  const mailboxes = useMemo(
    () => (connections ?? []).filter((c) => c.status === 'active'),
    [connections],
  )

  const [matterId, setMatterId] = useState('')
  const [matterSearch, setMatterSearch] = useState('')
  const [connectionId, setConnectionId] = useState('')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [category, setCategory] = useState<CorrespondenceCategory>('correspondence')
  const [isClientVisible, setIsClientVisible] = useState(false)
  const [inReplyTo, setInReplyTo] = useState<string | undefined>()
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [useAiDraft, setUseAiDraft] = useState(false)

  const initializedKeyRef = useRef('')
  const fixedMatter = Boolean(context?.matterId)
  const selectedMailbox = mailboxes.find((c) => c.id === connectionId)

  const draftQuery = useDraftOutboundReply(
    open && matterId
      ? {
          matterId,
          unlinkedEmailId: context?.unlinkedEmailId,
          correspondenceId: context?.correspondenceId,
        }
      : null,
  )

  const aiDraft = useMutation({
    mutationFn: () =>
      emailIntegrationApi.draftReply({
        matterId,
        unlinkedEmailId: context?.unlinkedEmailId,
        correspondenceId: context?.correspondenceId,
        useAi: true,
      }),
    onSuccess: (data) => {
      setBodyText(data.bodyText)
      setSubject(data.subject)
      if (data.to[0] && !to.trim()) setTo(data.to[0])
      if (data.inReplyToMessageId) setInReplyTo(data.inReplyToMessageId)
      setError(null)
    },
    onError: (err) => {
      setUseAiDraft(false)
      setError(getApiErrorMessage(err, 'AI draft failed'))
    },
  })

  const { data: matterResults, isFetching: searchingMatters } = useQuery({
    queryKey: ['outbound-matter-search', matterSearch],
    queryFn: () => mattersApi.list({ search: matterSearch, limit: 8 }),
    enabled: open && !fixedMatter && matterSearch.trim().length >= 2 && !matterId,
  })

  // Initialize once per open + context identity — never on every mailboxes re-render
  useEffect(() => {
    if (!open || !context) {
      initializedKeyRef.current = ''
      return
    }

    const key = contextKey(context)
    if (initializedKeyRef.current === key) return
    initializedKeyRef.current = key

    setError(null)
    setAttachments([])
    setUseAiDraft(false)
    setMatterId(context.matterId ?? '')
    setMatterSearch(context.matterTitle ?? '')
    setConnectionId(context.connectionId ?? '')
    setTo(context.to ?? '')
    setSubject(context.subject ?? '')
    setBodyText('')
    setCategory(context.category ?? 'correspondence')
    setInReplyTo(context.inReplyToMessageId ?? undefined)
  }, [open, context])

  // Fill mailbox once connections arrive (without wiping the rest of the form)
  useEffect(() => {
    if (!open || connectionId || mailboxes.length === 0) return
    const preferred = context?.connectionId
    const match = preferred
      ? mailboxes.find((c) => c.id === preferred)
      : undefined
    setConnectionId(match?.id ?? mailboxes[0]!.id)
  }, [open, connectionId, mailboxes, context?.connectionId])

  const canSend = useMemo(
    () =>
      Boolean(
        matterId &&
          connectionId &&
          to.trim() &&
          subject.trim() &&
          bodyText.trim() &&
          !sendOutbound.isPending,
      ),
    [matterId, connectionId, to, subject, bodyText, sendOutbound.isPending],
  )

  const applyOfficeActionDraft = () => {
    if (!draftQuery.data) return
    setBodyText(draftQuery.data.bodyText)
    setSubject(draftQuery.data.subject)
    if (draftQuery.data.to[0] && !to.trim()) {
      setTo(draftQuery.data.to[0])
    }
    if (draftQuery.data.inReplyToMessageId) {
      setInReplyTo(draftQuery.data.inReplyToMessageId)
    }
    setCategory('office_action')
  }

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const next: PendingAttachment[] = []
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`Attachment ${file.name} exceeds 5 MB`)
        continue
      }
      const contentBase64 = await fileToBase64(file)
      next.push({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        contentBase64,
        size: file.size,
      })
    }
    setAttachments((prev) => [...prev, ...next])
  }

  const handleSend = async () => {
    if (!canSend) return
    setError(null)
    try {
      const result = await sendOutbound.mutateAsync({
        connectionId,
        matterId,
        to: to
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean),
        subject: subject.trim(),
        bodyText: bodyText.trim(),
        inReplyToMessageId: inReplyTo,
        replyToUnlinkedEmailId: context?.unlinkedEmailId,
        replyToCorrespondenceId: context?.correspondenceId,
        category,
        isClientVisible,
        attachments: attachments.map(({ fileName, contentType, contentBase64 }) => ({
          fileName,
          contentType,
          contentBase64,
        })),
      })
      onSent?.(result.matterId)
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to send email'))
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Reply" className="max-w-xl">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Sends from your connected mailbox and files a sent copy on the matter correspondence
          register.
        </p>

        {!fixedMatter ? (
          <div className="space-y-2">
            <Label htmlFor="reply-matter">Matter</Label>
            <div className="relative">
              <Input
                id="reply-matter"
                value={matterSearch}
                onChange={(e) => {
                  setMatterSearch(e.target.value)
                  setMatterId('')
                }}
                placeholder="Search matter (min 2 characters)"
              />
              {searchingMatters ? (
                <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" />
              ) : null}
            </div>
            {matterResults?.items?.length ? (
              <ul className="max-h-36 overflow-y-auto rounded-md border">
                {matterResults.items.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-muted/60',
                        matterId === m.id && 'bg-primary/10',
                      )}
                      onClick={() => {
                        setMatterId(m.id)
                        setMatterSearch(m.title)
                      }}
                    >
                      {m.title}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Matter: </span>
            <span className="font-medium">{context?.matterTitle ?? matterId}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label>From mailbox</Label>
          {mailboxes.length === 0 ? (
            <p className="text-sm text-destructive">
              No active mailbox. Connect one under Settings → Email integration (reconnect after
              send scopes were added).
            </p>
          ) : (
            <Select value={connectionId || undefined} onValueChange={(v) => v && setConnectionId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select mailbox">
                  {selectedMailbox
                    ? `${selectedMailbox.emailAddress} (${selectedMailbox.provider})`
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {mailboxes.map((c: MailboxConnection) => (
                  <SelectItem key={c.id} value={c.id} label={c.emailAddress}>
                    {c.emailAddress} ({c.provider})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reply-to">To</Label>
          <Input
            id="reply-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reply-subject">Subject</Label>
          <Input
            id="reply-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="reply-body">Message</Label>
            {matterId ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={draftQuery.isFetching || !draftQuery.data}
                onClick={applyOfficeActionDraft}
              >
                {draftQuery.isFetching ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <FileText className="size-3.5" />
                )}
                Draft reply
              </Button>
            ) : null}
          </div>

          <PermissionGate resource="ai" action="create">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border"
                checked={useAiDraft}
                disabled={!matterId || aiDraft.isPending}
                onChange={(e) => {
                  const checked = e.target.checked
                  setUseAiDraft(checked)
                  if (checked && matterId) {
                    aiDraft.mutate()
                  }
                }}
              />
              <span className="inline-flex items-center gap-1.5">
                {aiDraft.isPending ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <Sparkles className="size-3.5 text-muted-foreground" />
                )}
                Generate draft with AI
              </span>
            </label>
          </PermissionGate>

          <Textarea
            id="reply-body"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={12}
            className="min-h-[220px] font-sans text-sm"
            placeholder="Write your reply… (or enable AI draft / click Draft reply)"
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={category}
            onValueChange={(v) => v && setCategory(v as CorrespondenceCategory)}
          >
            <SelectTrigger>
              <SelectValue>
                {CORRESPONDENCE_CATEGORY_LABELS[category]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CORRESPONDENCE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} label={CORRESPONDENCE_CATEGORY_LABELS[c]}>
                  {CORRESPONDENCE_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reply-files">Attachments</Label>
          <Input
            id="reply-files"
            type="file"
            multiple
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          {attachments.length ? (
            <ul className="space-y-1">
              {attachments.map((file) => (
                <li
                  key={`${file.fileName}-${file.size}`}
                  className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{file.fileName}</span>
                  </span>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() =>
                      setAttachments((prev) =>
                        prev.filter(
                          (a) =>
                            !(a.fileName === file.fileName && a.size === file.size),
                        ),
                      )
                    }
                  >
                    <X className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border bg-background px-3 py-2.5">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-input"
            checked={isClientVisible}
            onChange={(e) => setIsClientVisible(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium">Send to client inbox</span>
            <span className="text-xs text-muted-foreground">
              Show this message in the client portal Messages inbox.
            </span>
          </span>
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button className="w-full" disabled={!canSend} onClick={() => void handleSend()}>
          {sendOutbound.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {sendOutbound.isPending ? 'Sending…' : 'Send & file on matter'}
        </Button>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Reply className="mt-0.5 size-3.5 shrink-0" />
          If this is a queue reply, the incoming email is attached to the matter automatically
          before the outbound message is filed.
        </p>
      </div>
    </Drawer>
  )
}
