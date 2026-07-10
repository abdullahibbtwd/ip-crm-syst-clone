import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Loader2,
  Megaphone,
  Send,
  Users,
} from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { clientsApi } from '@/features/crm/api'
import {
  BROADCAST_AUDIENCE_OPTIONS,
  type BroadcastAudience,
  type BroadcastStatus,
} from '@/features/broadcasts/api'
import {
  useBroadcasts,
  useCreateBroadcast,
  usePreviewBroadcastAudience,
} from '@/features/broadcasts/hooks/useBroadcasts'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

function statusBadge(status: BroadcastStatus) {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
    case 'sending':
    case 'queued':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-700'
    case 'failed':
      return 'border-destructive/40 bg-destructive/10 text-destructive'
    default:
      return ''
  }
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function BroadcastsPage() {
  const { data: history, isLoading: historyLoading } = useBroadcasts()
  const createBroadcast = useCreateBroadcast()

  const [audience, setAudience] = useState<BroadcastAudience>('active_clients')
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const previewEnabled = audience !== 'manual' || selectedClientIds.length > 0
  const preview = usePreviewBroadcastAudience(
    audience,
    audience === 'manual' ? selectedClientIds : undefined,
    previewEnabled,
  )

  const { data: clientResults, isFetching: searchingClients } = useQuery({
    queryKey: ['broadcast-client-search', clientSearch],
    queryFn: () => clientsApi.list({ search: clientSearch, limit: 10, status: 'active' }),
    enabled: audience === 'manual' && clientSearch.trim().length >= 2,
  })

  const audienceMeta = useMemo(
    () => BROADCAST_AUDIENCE_OPTIONS.find((o) => o.value === audience),
    [audience],
  )

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleSend = async () => {
    setError(null)
    setSuccess(null)
    if (!subject.trim() || !bodyText.trim()) {
      setError('Subject and message are required')
      return
    }
    if (audience === 'manual' && selectedClientIds.length === 0) {
      setError('Select at least one client')
      return
    }
    try {
      const result = await createBroadcast.mutateAsync({
        audience,
        subject: subject.trim(),
        bodyText: bodyText.trim(),
        clientIds: audience === 'manual' ? selectedClientIds : undefined,
      })
      setSuccess(
        `Broadcast queued to ${result.totalRecipients} recipient(s). Delivery runs in the background.`,
      )
      setSubject('')
      setBodyText('')
      setSelectedClientIds([])
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to queue broadcast'))
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">Broadcasts</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Send bulk notifications to client contact emails via firm SMTP. Each send is audited as{' '}
          <code className="text-xs">bulk_notification</code>. Matter mailbox replies stay on Email
          Queue / Correspondence.
        </p>
      </div>

      <PermissionGate resource="broadcast" action="create">
        <section className="space-y-5 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Megaphone className="size-4" />
            </div>
            <div>
              <h2 className="font-medium">Compose broadcast</h2>
              <p className="text-xs text-muted-foreground">
                {audienceMeta?.description}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Recipient group</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {BROADCAST_AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setAudience(opt.value)
                    setSuccess(null)
                    setError(null)
                  }}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left transition-colors',
                    audience === opt.value
                      ? 'border-primary/40 bg-primary/5'
                      : 'hover:bg-muted/40',
                  )}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {audience === 'manual' ? (
            <div className="space-y-2">
              <Label htmlFor="broadcast-client-search">Select clients</Label>
              <div className="relative">
                <Input
                  id="broadcast-client-search"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search clients (min 2 characters)"
                />
                {searchingClients ? (
                  <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" />
                ) : null}
              </div>
              {clientResults?.items?.length ? (
                <ul className="max-h-40 overflow-y-auto rounded-md border">
                  {clientResults.items.map((c) => {
                    const label =
                      c.companyName ||
                      [c.firstName, c.lastName].filter(Boolean).join(' ') ||
                      c.internalCode ||
                      c.id
                    const checked = selectedClientIds.includes(c.id)
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          className={cn(
                            'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50',
                            checked && 'bg-primary/10',
                          )}
                          onClick={() => toggleClient(c.id)}
                        >
                          <span>{label}</span>
                          <span className="text-xs text-muted-foreground">
                            {checked ? 'Selected' : 'Add'}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
              {selectedClientIds.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {selectedClientIds.length} client(s) selected
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
            <Users className="size-4 text-muted-foreground" />
            {preview.isFetching ? (
              <span className="text-muted-foreground">Counting recipients…</span>
            ) : preview.isError ? (
              <span className="text-destructive">Could not preview audience</span>
            ) : (
              <span>
                <strong>{preview.data?.count ?? 0}</strong> recipient
                {(preview.data?.count ?? 0) === 1 ? '' : 's'} matched
              </span>
            )}
          </div>

          {preview.data?.recipients?.length ? (
            <div className="max-h-36 overflow-y-auto rounded-md border text-xs">
              <table className="w-full">
                <tbody>
                  {preview.data.recipients.slice(0, 40).map((r) => (
                    <tr key={`${r.clientId}-${r.email}`} className="border-b last:border-0">
                      <td className="px-3 py-1.5 font-medium">{r.displayName}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(preview.data.count ?? 0) > 40 ? (
                <p className="border-t px-3 py-1.5 text-muted-foreground">
                  …and {(preview.data.count ?? 0) - 40} more
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="broadcast-subject">Subject</Label>
            <Input
              id="broadcast-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Upcoming EU renewal reminders"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-body">Message</Label>
            <Textarea
              id="broadcast-body"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={10}
              className="min-h-[200px]"
              placeholder="Write the notification your clients will receive…"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

          <Button
            disabled={
              createBroadcast.isPending ||
              !subject.trim() ||
              !bodyText.trim() ||
              (preview.data?.count ?? 0) < 1
            }
            onClick={() => void handleSend()}
          >
            {createBroadcast.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {createBroadcast.isPending ? 'Queuing…' : 'Send broadcast'}
          </Button>
        </section>
      </PermissionGate>

      <section className="space-y-3">
        <h2 className="font-medium">Recent broadcasts</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Sent</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historyLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : !(history?.length) ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No broadcasts yet.
                </TableCell>
              </TableRow>
            ) : (
              history.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">
                    {formatWhen(row.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-[220px] font-medium">
                    <span className="line-clamp-2">{row.subject}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {BROADCAST_AUDIENCE_OPTIONS.find((o) => o.value === row.audience)?.label ??
                      row.audience}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('normal-case', statusBadge(row.status))}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {row.sentCount}/{row.totalRecipients}
                    {row.failedCount > 0 ? (
                      <span className="text-destructive"> ({row.failedCount} failed)</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.createdBy.fullName}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}
