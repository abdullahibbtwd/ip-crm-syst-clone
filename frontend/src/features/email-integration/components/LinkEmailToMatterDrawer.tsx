import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Link2, Loader2, Search, Sparkles } from 'lucide-react'
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
import { clientsApi } from '@/features/crm/api'
import { clientDisplayName } from '@/features/crm/utils'
import type { CorrespondenceCategory } from '@/features/correspondence/types'
import {
  CORRESPONDENCE_CATEGORIES,
  CORRESPONDENCE_CATEGORY_LABELS,
} from '@/features/correspondence/utils'
import { mattersApi } from '@/features/matters/api'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { useLinkQueuedEmail } from '../hooks/useEmailIntegration'
import type { QueueClientSuggestion, UnlinkedEmail } from '../types'

type LinkScope = 'matter' | 'client'

type LinkEmailToMatterDrawerProps = {
  emailId: string | null
  emailSubject?: string
  suggestedMatter?: UnlinkedEmail['suggestedMatter']
  suggestedClient?: QueueClientSuggestion | null
  suggestedCategory?: CorrespondenceCategory | null
  suggestionReason?: string | null
  fixedMatterId?: string
  fixedMatterTitle?: string
  open: boolean
  onClose: () => void
  onLinked?: () => void
}

function matterSearchLabel(
  matter: UnlinkedEmail['suggestedMatter'] | undefined,
) {
  if (!matter) return ''
  const client =
    matter.client.companyName ??
    [matter.client.firstName, matter.client.lastName].filter(Boolean).join(' ')
  const code = matter.client.internalCode ? `${matter.client.internalCode} · ` : ''
  return `${code}${client} — ${matter.title}`
}

function clientSearchLabel(client: QueueClientSuggestion | null | undefined) {
  if (!client) return ''
  const name = clientDisplayName({
    type: client.companyName ? 'company' : 'individual',
    companyName: client.companyName,
    firstName: client.firstName,
    lastName: client.lastName,
  })
  const code = client.internalCode ? `${client.internalCode} · ` : ''
  return `${code}${name}`
}

export function LinkEmailToMatterDrawer({
  emailId,
  emailSubject,
  suggestedMatter,
  suggestedClient,
  suggestedCategory,
  suggestionReason,
  fixedMatterId,
  fixedMatterTitle,
  open,
  onClose,
  onLinked,
}: LinkEmailToMatterDrawerProps) {
  const linkEmail = useLinkQueuedEmail()
  const [scope, setScope] = useState<LinkScope>('matter')
  const [matterSearch, setMatterSearch] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [category, setCategory] = useState<CorrespondenceCategory>('correspondence')
  const [error, setError] = useState<string | null>(null)
  const [linked, setLinked] = useState(false)

  const { data: matterResults, isFetching: searchingMatters } = useQuery({
    queryKey: ['email-queue-matter-search', matterSearch],
    queryFn: () => mattersApi.list({ search: matterSearch, limit: 8 }),
    enabled:
      open && !fixedMatterId && scope === 'matter' && matterSearch.trim().length >= 2,
  })

  const { data: clientResults, isFetching: searchingClients } = useQuery({
    queryKey: ['email-queue-client-search', clientSearch],
    queryFn: () => clientsApi.list({ search: clientSearch, limit: 8 }),
    enabled:
      open && !fixedMatterId && scope === 'client' && clientSearch.trim().length >= 2,
  })

  useEffect(() => {
    if (!open) {
      setError(null)
      setLinked(false)
      return
    }
    const initialScope: LinkScope =
      suggestedMatter || (!suggestedClient && fixedMatterId) ? 'matter' : suggestedClient ? 'client' : 'matter'
    setScope(fixedMatterId ? 'matter' : initialScope)
    setMatterSearch(suggestedMatter ? matterSearchLabel(suggestedMatter) : '')
    setClientSearch(suggestedClient ? clientSearchLabel(suggestedClient) : '')
    setCategory(suggestedCategory ?? 'correspondence')
  }, [open, suggestedMatter, suggestedClient, suggestedCategory, fixedMatterId])

  const handleLinkMatter = async (matterId: string) => {
    if (!emailId) return
    setError(null)
    try {
      await linkEmail.mutateAsync({ id: emailId, matterId, category })
      setLinked(true)
      onLinked?.()
      window.setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to attach email to matter'))
    }
  }

  const handleLinkClient = async (clientId: string) => {
    if (!emailId) return
    setError(null)
    try {
      await linkEmail.mutateAsync({ id: emailId, clientId, category })
      setLinked(true)
      onLinked?.()
      window.setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to attach email to client'))
    }
  }

  const title = fixedMatterId ? 'Attach to correspondence' : 'Attach email'
  const canOneClickMatter = Boolean(suggestedMatter && !fixedMatterId && scope === 'matter')
  const canOneClickClient = Boolean(suggestedClient && !fixedMatterId && scope === 'client')

  return (
    <Drawer open={open} onClose={onClose} title={title} className="max-w-md">
      <div className="space-y-4">
        {emailSubject ? (
          <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Email: </span>
            <span className="font-medium">{emailSubject}</span>
          </p>
        ) : null}

        {suggestedCategory ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm">
            <Sparkles className="size-3.5 text-primary" />
            <span>
              Auto-classified as{' '}
              <strong>{CORRESPONDENCE_CATEGORY_LABELS[suggestedCategory]}</strong>
            </span>
            {suggestedCategory === 'office_action' ? (
              <span className="text-xs text-muted-foreground">
                (will create office-action deadlines on link)
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-medium">Correspondence category</label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as CorrespondenceCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CORRESPONDENCE_CATEGORIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {CORRESPONDENCE_CATEGORY_LABELS[value]}
                  {suggestedCategory === value ? ' (suggested)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {fixedMatterId ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This email will be filed on the current matter&apos;s correspondence register with the
              `.eml` attached.
            </p>
            {fixedMatterTitle ? (
              <p className="rounded-lg border px-3 py-2 text-sm font-medium">{fixedMatterTitle}</p>
            ) : null}
            <Button
              className="w-full"
              disabled={!emailId || linkEmail.isPending || linked}
              onClick={() => void handleLinkMatter(fixedMatterId)}
            >
              {linkEmail.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : linked ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Link2 className="size-4" />
              )}
              {linked ? 'Attached' : 'Confirm & link'}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex rounded-lg border p-0.5">
              <button
                type="button"
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm transition-colors',
                  scope === 'matter'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setScope('matter')}
              >
                Matter
              </button>
              <button
                type="button"
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm transition-colors',
                  scope === 'client'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setScope('client')}
              >
                Client
              </button>
            </div>

            {scope === 'matter' ? (
              <>
                {canOneClickMatter ? (
                  <button
                    type="button"
                    className={cn(
                      'flex w-full flex-col gap-1 rounded-lg border border-primary/40 bg-primary/5 px-3 py-3 text-left transition-colors hover:bg-primary/10',
                    )}
                    disabled={linkEmail.isPending || linked}
                    onClick={() => void handleLinkMatter(suggestedMatter!.id)}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-primary">
                          Confirm & link
                        </p>
                        <p className="mt-0.5 font-medium">{matterSearchLabel(suggestedMatter)}</p>
                      </div>
                      {linkEmail.isPending ? (
                        <Loader2 className="size-4 animate-spin text-primary" />
                      ) : (
                        <Link2 className="size-4 shrink-0 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {CORRESPONDENCE_CATEGORY_LABELS[category]}
                      {suggestionReason ? ` · ${suggestionReason.replace(/_/g, ' ')}` : ''}
                    </p>
                  </button>
                ) : null}

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {canOneClickMatter ? 'Or choose another matter' : 'Matter'}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="bg-background pl-9"
                      placeholder="Search client, matter title, or reference…"
                      value={matterSearch}
                      onChange={(e) => setMatterSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  {searchingMatters ? (
                    <p className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Searching…
                    </p>
                  ) : null}
                  {(matterResults?.items ?? []).map((matter) => (
                    <button
                      key={matter.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                      disabled={linkEmail.isPending}
                      onClick={() => void handleLinkMatter(matter.id)}
                    >
                      <span className="line-clamp-2 font-medium">{matter.title}</span>
                      <Link2 className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {canOneClickClient ? (
                  <button
                    type="button"
                    className={cn(
                      'flex w-full flex-col gap-1 rounded-lg border border-primary/40 bg-primary/5 px-3 py-3 text-left transition-colors hover:bg-primary/10',
                    )}
                    disabled={linkEmail.isPending || linked}
                    onClick={() => void handleLinkClient(suggestedClient!.id)}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-primary">
                          Confirm & link
                        </p>
                        <p className="mt-0.5 font-medium">{clientSearchLabel(suggestedClient)}</p>
                      </div>
                      {linkEmail.isPending ? (
                        <Loader2 className="size-4 animate-spin text-primary" />
                      ) : (
                        <Link2 className="size-4 shrink-0 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {CORRESPONDENCE_CATEGORY_LABELS[category]}
                      {suggestionReason ? ` · ${suggestionReason.replace(/_/g, ' ')}` : ''}
                    </p>
                  </button>
                ) : null}

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {canOneClickClient ? 'Or choose another client' : 'Client'}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="bg-background pl-9"
                      placeholder="Search client name or code…"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  {searchingClients ? (
                    <p className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Searching…
                    </p>
                  ) : null}
                  {(clientResults?.items ?? []).map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                      disabled={linkEmail.isPending}
                      onClick={() => void handleLinkClient(client.id)}
                    >
                      <span className="line-clamp-2 font-medium">
                        {client.internalCode
                          ? `${client.internalCode} · ${client.displayName}`
                          : client.displayName}
                      </span>
                      <Link2 className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {linked ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" />
            Email attached to {scope === 'client' ? 'client' : 'matter'} correspondence.
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </Drawer>
  )
}
