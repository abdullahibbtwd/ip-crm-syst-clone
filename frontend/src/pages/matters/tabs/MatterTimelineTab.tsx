import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { useMatterTimeline } from '@/features/correspondence/hooks/useCorrespondence'
import {
  DIRECTION_LABELS,
  STATUS_LABELS,
  TIMELINE_EVENT_LABELS,
  formatCorrespondenceDate,
} from '@/features/correspondence/utils'
import { cn } from '@/lib/utils'
import type { MatterTabContext } from '../MatterLayout'

export function MatterTimelineTab() {
  const { matterId } = useOutletContext<MatterTabContext>()
  const { data: events, isLoading, isError } = useMatterTimeline(matterId)

  const rows = useMemo(
    () =>
      [...(events ?? [])].sort((a, b) => {
        const byOccurred =
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
        if (byOccurred !== 0) return byOccurred
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }),
    [events],
  )

  if (isLoading && !events) {
    return <p className="text-sm text-muted-foreground">Loading timeline…</p>
  }
  if (isError) {
    return <p className="text-sm text-destructive">Failed to load timeline.</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-medium">Timeline</h2>
        <p className="text-sm text-muted-foreground">
          Chronological history of prosecution and correspondence on this matter.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No timeline events yet. Log correspondence or file an application to see activity here.
        </p>
      ) : (
        <ol className="relative space-y-0 border-l border-border pl-6">
          {rows.map((event, index) => (
            <li key={event.id} className={cn('pb-8', index === rows.length - 1 && 'pb-0')}>
              <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-background bg-primary" />
              <div className="flex flex-wrap items-center gap-2">
                <time className="text-xs text-muted-foreground">
                  {formatCorrespondenceDate(event.occurredAt)}
                </time>
                <Badge variant="secondary" className="normal-case font-normal">
                  {TIMELINE_EVENT_LABELS[event.eventType]}
                </Badge>
                {event.correspondence ? (
                  <Badge variant="outline" className="normal-case font-normal">
                    {DIRECTION_LABELS[event.correspondence.direction]} ·{' '}
                    {STATUS_LABELS[event.correspondence.status]}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 font-medium">{event.title}</p>
              {event.description ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{event.description}</p>
              ) : null}
              {event.createdBy ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Logged by {event.createdBy.fullName}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
