import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiClient } from '@/lib/api-client'
import { formatCorrespondenceDate } from '@/features/correspondence/utils'
import { cn } from '@/lib/utils'

export type PortalInboxMessage = {
  id: string
  kind: 'broadcast' | 'correspondence'
  subject: string
  bodyText: string | null
  bodyHtml: string | null
  date: string
  readAt: string | null
  direction: 'incoming' | 'outgoing'
  sourceId: string
  matter: {
    id: string
    title: string
    matterType: string
    status: string
  } | null
}

type PortalMessagesResponse = {
  items: PortalInboxMessage[]
  total: number
  unreadCount: number
}

export const portalMessagesKeys = {
  all: ['portal-messages'] as const,
  list: () => [...portalMessagesKeys.all, 'list'] as const,
  unread: () => [...portalMessagesKeys.all, 'unread-count'] as const,
  detail: (kind: string, id: string) =>
    [...portalMessagesKeys.all, 'detail', kind, id] as const,
}

export function PortalMessagesPage() {
  const { t } = useTranslation('portal')
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: portalMessagesKeys.list(),
    queryFn: () => apiClient.get<PortalMessagesResponse>('/portal/messages'),
  })

  const selected = useMemo(
    () => data?.items.find((item) => item.id === selectedId) ?? null,
    [data?.items, selectedId],
  )

  const { data: detail, isFetching: detailLoading } = useQuery({
    queryKey: selected
      ? portalMessagesKeys.detail(selected.kind, selected.sourceId)
      : ['portal-messages', 'detail', 'none'],
    queryFn: async () => {
      const item = await apiClient.get<PortalInboxMessage>(
        selected!.kind === 'broadcast'
          ? `/portal/messages/broadcast/${selected!.sourceId}`
          : `/portal/messages/correspondence/${selected!.sourceId}`,
      )
      void qc.invalidateQueries({ queryKey: portalMessagesKeys.list() })
      void qc.invalidateQueries({ queryKey: portalMessagesKeys.unread() })
      return item
    },
    enabled: Boolean(selected),
  })

  const rows = data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">
          {t('messages.title', { defaultValue: 'Messages' })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('messages.description', {
            defaultValue:
              'Firm broadcasts and matter messages shared with your organisation.',
          })}
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">
          {t('messages.loading', { defaultValue: 'Loading messages…' })}
        </p>
      )}
      {isError && (
        <p className="text-sm text-destructive">
          {t('messages.error', { defaultValue: 'Failed to load messages.' })}
        </p>
      )}

      {rows.length === 0 && !isLoading && !isError && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('messages.empty', {
            defaultValue: 'No messages yet. Firm updates and shared correspondence will appear here.',
          })}
        </p>
      )}

      {rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            <ul className="space-y-2 md:hidden">
              {rows.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded-lg border p-4 text-left',
                      selectedId === item.id && 'border-primary bg-primary/5',
                      !item.readAt && 'border-l-4 border-l-primary',
                    )}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <MessageRowSummary item={item} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="hidden md:block rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('messages.table.type', { defaultValue: 'Type' })}</TableHead>
                    <TableHead>{t('messages.table.subject', { defaultValue: 'Subject' })}</TableHead>
                    <TableHead>{t('messages.table.date', { defaultValue: 'Date' })}</TableHead>
                    <TableHead>{t('messages.table.matter', { defaultValue: 'Matter' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((item) => (
                    <TableRow
                      key={item.id}
                      className={cn(
                        'cursor-pointer',
                        selectedId === item.id && 'bg-muted/60',
                        !item.readAt && 'font-semibold',
                      )}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <KindBadge kind={item.kind} />
                          {!item.readAt ? (
                            <span className="size-1.5 rounded-full bg-primary" aria-label="Unread" />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <span className={cn('line-clamp-2', !item.readAt && 'font-semibold')}>
                          {item.subject}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatCorrespondenceDate(item.date)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.matter?.title ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="min-h-[240px] rounded-lg border p-4">
            {!selected && (
              <p className="text-sm text-muted-foreground">
                {t('messages.selectHint', {
                  defaultValue: 'Select a message to read it.',
                })}
              </p>
            )}
            {selected && detailLoading && !detail && (
              <p className="text-sm text-muted-foreground">
                {t('messages.loadingDetail', { defaultValue: 'Opening…' })}
              </p>
            )}
            {selected && detail && (
              <article className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <KindBadge kind={detail.kind} />
                  <span className="text-xs text-muted-foreground">
                    {formatCorrespondenceDate(detail.date)}
                  </span>
                </div>
                <h2 className="font-serif text-xl text-foreground">{detail.subject}</h2>
                {detail.matter ? (
                  <p className="text-sm text-muted-foreground">
                    {t('messages.relatedMatter', { defaultValue: 'Matter' })}:{' '}
                    <Link
                      to={`/matters/${detail.matter.id}`}
                      className="text-primary hover:underline"
                    >
                      {detail.matter.title}
                    </Link>
                  </p>
                ) : null}
                {detail.bodyHtml ? (
                  <div
                    className="prose prose-sm max-w-none text-foreground"
                    dangerouslySetInnerHTML={{ __html: detail.bodyHtml }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                    {detail.bodyText ||
                      t('messages.noBody', { defaultValue: 'No message body.' })}
                  </pre>
                )}
              </article>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function KindBadge({ kind }: { kind: PortalInboxMessage['kind'] }) {
  const { t } = useTranslation('portal')
  if (kind === 'broadcast') {
    return (
      <Badge variant="info" className="normal-case gap-1">
        <Megaphone className="size-3" />
        {t('messages.kindBroadcast', { defaultValue: 'Broadcast' })}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="normal-case gap-1">
      <Mail className="size-3" />
      {t('messages.kindCorrespondence', { defaultValue: 'Matter' })}
    </Badge>
  )
}

function MessageRowSummary({ item }: { item: PortalInboxMessage }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <KindBadge kind={item.kind} />
        {!item.readAt ? (
          <span className="size-1.5 rounded-full bg-primary" aria-label="Unread" />
        ) : null}
      </div>
      <p
        className={cn(
          'leading-snug break-words',
          item.readAt ? 'font-medium' : 'font-semibold',
        )}
      >
        {item.subject}
      </p>
      {item.matter ? (
        <p className="mt-1 text-sm text-muted-foreground">{item.matter.title}</p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        {formatCorrespondenceDate(item.date)}
      </p>
    </div>
  )
}
