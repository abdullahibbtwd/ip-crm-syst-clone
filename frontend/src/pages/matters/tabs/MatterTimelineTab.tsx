import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useMatterTimeline } from '@/features/correspondence/hooks/useCorrespondence'
import {
  formatCorrespondenceDate,
  timelineEventLabel,
  correspondenceDirectionLabel,
  correspondenceStatusLabel,
} from '@/features/correspondence/utils'
import { cn } from '@/lib/utils'
import type { MatterTabContext } from '../MatterLayout'

export function MatterTimelineTab() {
  const { t } = useTranslation('matters')
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
    return <p className="text-sm text-muted-foreground">{t('timeline.loading')}</p>
  }
  if (isError) {
    return <p className="text-sm text-destructive">{t('timeline.error')}</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-medium">{t('timeline.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('timeline.description')}</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          {t('timeline.empty')}
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
                  {timelineEventLabel(event.eventType)}
                </Badge>
                {event.correspondence ? (
                  <Badge variant="outline" className="normal-case font-normal">
                    {correspondenceDirectionLabel(event.correspondence.direction)} ·{' '}
                    {correspondenceStatusLabel(event.correspondence.status)}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 font-medium">{event.title}</p>
              {event.description ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{event.description}</p>
              ) : null}
              {event.createdBy ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('timeline.loggedBy', { name: event.createdBy.fullName })}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
