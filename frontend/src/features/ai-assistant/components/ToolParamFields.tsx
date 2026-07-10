import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { correspondenceApi } from '@/features/correspondence/api'
import { emailIntegrationApi } from '@/features/email-integration/api'
import { mattersApi } from '@/features/matters/api'
import { matterKeys } from '@/features/matters/queryKeys'

function clientName(client: {
  companyName: string | null
  firstName: string | null
  lastName: string | null
  internalCode: string | null
}): string {
  return (
    client.companyName ||
    [client.firstName, client.lastName].filter(Boolean).join(' ') ||
    client.internalCode ||
    'Client'
  )
}

function paramLabel(key: string): string {
  const labels: Record<string, string> = {
    matterId: 'Matter',
    correspondenceId: 'Correspondence',
    unlinkedEmailId: 'Queued email',
  }
  return labels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/Id$/, '')
}

type ToolParamFieldsProps = {
  propertyKeys: string[]
  required: Set<string>
  params: Record<string, string>
  onChange: (key: string, value: string) => void
  enabled: boolean
}

export function ToolParamFields({
  propertyKeys,
  required,
  params,
  onChange,
  enabled,
}: ToolParamFieldsProps) {
  const matterId = params.matterId?.trim() || ''

  const mattersQuery = useQuery({
    queryKey: matterKeys.list({ limit: 50, status: 'active' }),
    queryFn: () => mattersApi.list({ limit: 50, status: 'active' }),
    enabled: enabled && propertyKeys.includes('matterId'),
    staleTime: 60_000,
  })

  const correspondenceQuery = useQuery({
    queryKey: ['ai-assistant', 'correspondence', matterId],
    queryFn: () => correspondenceApi.listForMatter(matterId),
    enabled: enabled && propertyKeys.includes('correspondenceId') && Boolean(matterId),
    staleTime: 30_000,
  })

  const queueQuery = useQuery({
    queryKey: ['ai-assistant', 'email-queue'],
    queryFn: () => emailIntegrationApi.listQueue(),
    enabled: enabled && propertyKeys.includes('unlinkedEmailId'),
    staleTime: 30_000,
  })

  const matters = mattersQuery.data?.items ?? []
  const selectedMatter = matters.find((m) => m.id === matterId)
  const correspondence = correspondenceQuery.data ?? []
  const selectedCorrespondence = correspondence.find(
    (c) => c.id === params.correspondenceId,
  )
  const queue = queueQuery.data ?? []
  const selectedQueued = queue.find((e) => e.id === params.unlinkedEmailId)

  if (propertyKeys.length === 0) return null

  return (
    <div className="space-y-2.5">
      <Label className="text-xs text-brand-green/80">Select</Label>

      {propertyKeys.includes('matterId') ? (
        <div className="space-y-1">
          <Label className="text-xs">
            Matter
            {required.has('matterId') ? (
              <span className="text-destructive"> *</span>
            ) : null}
          </Label>
          {mattersQuery.isLoading ? (
            <div className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading matters…
            </div>
          ) : (
            <Select
              value={matterId || undefined}
              onValueChange={(v) => {
                if (!v) return
                onChange('matterId', v)
                // Clear dependent picks when matter changes
                if (params.correspondenceId) onChange('correspondenceId', '')
              }}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="Choose a matter">
                  {selectedMatter
                    ? `${selectedMatter.title} · ${clientName(selectedMatter.client)}`
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {matters.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    No active matters found
                  </div>
                ) : (
                  matters.map((m) => (
                    <SelectItem
                      key={m.id}
                      value={m.id}
                      label={`${m.title} · ${clientName(m.client)}`}
                    >
                      <span className="flex flex-col gap-0.5 text-left">
                        <span className="font-medium">{m.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {clientName(m.client)} · {m.matterType}
                        </span>
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      ) : null}

      {propertyKeys.includes('correspondenceId') ? (
        <div className="space-y-1">
          <Label className="text-xs">
            {paramLabel('correspondenceId')}
            {required.has('correspondenceId') ? (
              <span className="text-destructive"> *</span>
            ) : (
              <span className="text-muted-foreground"> (optional)</span>
            )}
          </Label>
          {!matterId ? (
            <p className="text-xs text-muted-foreground">Select a matter first</p>
          ) : correspondenceQuery.isLoading ? (
            <div className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading correspondence…
            </div>
          ) : (
            <Select
              value={params.correspondenceId || undefined}
              onValueChange={(v) => {
                onChange('correspondenceId', v ?? '')
                if (v) onChange('unlinkedEmailId', '')
              }}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="Choose correspondence">
                  {selectedCorrespondence
                    ? selectedCorrespondence.subject || '(No subject)'
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {correspondence.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    No correspondence on this matter
                  </div>
                ) : (
                  correspondence.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      label={c.subject || '(No subject)'}
                    >
                      <span className="flex flex-col gap-0.5 text-left">
                        <span className="font-medium">
                          {c.subject || '(No subject)'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {c.direction} · {c.sender}
                        </span>
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      ) : null}

      {propertyKeys.includes('unlinkedEmailId') ? (
        <div className="space-y-1">
          <Label className="text-xs">
            {paramLabel('unlinkedEmailId')}
            {required.has('unlinkedEmailId') ? (
              <span className="text-destructive"> *</span>
            ) : (
              <span className="text-muted-foreground"> (optional)</span>
            )}
          </Label>
          {queueQuery.isLoading ? (
            <div className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading queue…
            </div>
          ) : (
            <Select
              value={params.unlinkedEmailId || undefined}
              onValueChange={(v) => {
                onChange('unlinkedEmailId', v ?? '')
                if (v) onChange('correspondenceId', '')
              }}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="Choose a queued email">
                  {selectedQueued ? selectedQueued.subject || '(No subject)' : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {queue.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Email queue is empty
                  </div>
                ) : (
                  queue.map((e) => (
                    <SelectItem
                      key={e.id}
                      value={e.id}
                      label={e.subject || '(No subject)'}
                    >
                      <span className="flex flex-col gap-0.5 text-left">
                        <span className="font-medium">
                          {e.subject || '(No subject)'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {e.sender}
                        </span>
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      ) : null}

      {/* Fallback for any unknown param keys */}
      {propertyKeys
        .filter(
          (k) =>
            k !== 'matterId' &&
            k !== 'correspondenceId' &&
            k !== 'unlinkedEmailId',
        )
        .map((key) => (
          <p key={key} className="text-xs text-muted-foreground">
            Unsupported parameter: {key}
          </p>
        ))}
    </div>
  )
}
